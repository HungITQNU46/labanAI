const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/accModel');
const PasswordReset = require('../models/passwordResetModel');
const { sendPasswordResetCode } = require('../services/emailService');
const { hasStrongPassword } = require('../utils/passwordPolicy');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const RESET_CODE_TTL_MS = 3 * 60 * 1000;
const RESET_CODE_RESEND_DELAY_MS = 60 * 1000;
const MAX_RESET_CODE_ATTEMPTS = 5;
const GENERIC_RESET_MESSAGE = 'Nếu email đã đăng ký, mã xác nhận sẽ được gửi đến hộp thư của bạn.';

const normalizeIdentifier = (value) => String(value || '').trim();

const normalizePhone = (value) => String(value || '').replace(/[\s().-]/g, '');

const isValidPhone = (phone) => !phone || PHONE_PATTERN.test(phone);

const getIdentifierFields = (identifier) => {
    if (identifier.includes('@')) {
        const email = identifier.toLowerCase();
        return EMAIL_PATTERN.test(email) ? { email } : null;
    }

    const phone = identifier.replace(/[\s().-]/g, '');
    return PHONE_PATTERN.test(phone) ? { phone } : null;
};

const sendServerError = (res, error, message) => {
    console.error(message, error);
    return res.status(500).json({ message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' });
};

// Yêu cầu mã đặt lại mật khẩu và gửi mã sáu chữ số đến email đã đăng ký.
const requestPasswordReset = async (req, res) => {
    const email = normalizeIdentifier(req.body?.email).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
    }

    try {
        const existingChallenge = await PasswordReset.findOne({ email }).lean();
        const now = Date.now();
        if (existingChallenge && now - existingChallenge.updatedAt.getTime() < RESET_CODE_RESEND_DELAY_MS) {
            return res.json({ message: GENERIC_RESET_MESSAGE });
        }

        const user = await User.findOne({ email, trangThai: true }).select('_id').lean();
        if (!user) return res.json({ message: GENERIC_RESET_MESSAGE });

        const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
        const codeHash = await bcrypt.hash(code, 10);
        await PasswordReset.findOneAndUpdate(
            { email },
            {
                $set: {
                    codeHash,
                    attempts: 0,
                    resetTokenHash: null,
                    expiresAt: new Date(now + RESET_CODE_TTL_MS)
                }
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        try {
            await sendPasswordResetCode(email, code);
        } catch (error) {
            await PasswordReset.deleteOne({ email });
            console.error('Lỗi gửi email đặt lại mật khẩu:', error);
            if (error.message.startsWith('Cấu hình SMTP chưa đầy đủ')) {
                return res.status(503).json({ message: 'Hệ thống chưa cấu hình dịch vụ gửi email. Vui lòng liên hệ quản trị viên.' });
            }
            return res.status(503).json({ message: 'Không thể gửi email lúc này. Vui lòng thử lại sau.' });
        }

        return res.json({ message: GENERIC_RESET_MESSAGE });
    } catch (error) {
        return sendServerError(res, error, 'Lỗi yêu cầu đặt lại mật khẩu:');
    }
};

// Xác minh mã sáu chữ số và cấp token dùng một lần để đổi mật khẩu.
const verifyPasswordResetCode = async (req, res) => {
    const email = normalizeIdentifier(req.body?.email).toLowerCase();
    const code = String(req.body?.code || '');
    if (!EMAIL_PATTERN.test(email) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ message: 'Email hoặc mã xác nhận không hợp lệ.' });
    }

    try {
        const challenge = await PasswordReset.findOne({ email });
        if (
            !challenge
            || challenge.expiresAt <= new Date()
            || challenge.attempts >= MAX_RESET_CODE_ATTEMPTS
            || challenge.resetTokenHash
        ) {
            return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.' });
        }

        if (!(await bcrypt.compare(code, challenge.codeHash))) {
            await PasswordReset.updateOne(
                { _id: challenge._id, attempts: { $lt: MAX_RESET_CODE_ATTEMPTS }, resetTokenHash: null },
                { $inc: { attempts: 1 } }
            );
            return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy kiểm tra lại mã.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenUpdate = await PasswordReset.updateOne(
            {
                _id: challenge._id,
                attempts: { $lt: MAX_RESET_CODE_ATTEMPTS },
                expiresAt: { $gt: new Date() },
                resetTokenHash: null
            },
            { $set: { resetTokenHash: crypto.createHash('sha256').update(resetToken).digest('hex') } }
        );
        if (tokenUpdate.modifiedCount !== 1) {
            return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.' });
        }
        return res.json({ message: 'Xác minh thành công.', resetToken });
    } catch (error) {
        return sendServerError(res, error, 'Lỗi xác minh mã đặt lại mật khẩu:');
    }
};

// Đổi mật khẩu sau khi mã email đã được xác minh và tiêu thụ token dùng một lần.
const resetPassword = async (req, res) => {
    const email = normalizeIdentifier(req.body?.email).toLowerCase();
    const resetToken = String(req.body?.resetToken || '');
    const password = String(req.body?.password || '');
    if (!EMAIL_PATTERN.test(email) || !/^[a-f0-9]{64}$/.test(resetToken)) {
        return res.status(400).json({ message: 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }
    if (!hasStrongPassword(password)) {
        return res.status(400).json({
            message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt; tối đa 72 byte.'
        });
    }

    try {
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const challenge = await PasswordReset.findOneAndDelete({
            email,
            resetTokenHash,
            expiresAt: { $gt: new Date() }
        });
        if (!challenge) {
            return res.status(400).json({ message: 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const result = await User.updateOne(
            { email, trangThai: true },
            { $set: { matKhau: passwordHash } }
        );
        if (result.matchedCount !== 1) {
            return res.status(400).json({ message: 'Không tìm thấy tài khoản đang hoạt động với email này.' });
        }
        return res.json({ message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
    } catch (error) {
        return sendServerError(res, error, 'Lỗi đặt lại mật khẩu:');
    }
};

const setAuthenticatedSession = (req, user) => new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
        if (error) return reject(error);
        req.session.user = {
            id: user._id.toString(),
            name: user.hoTen,
            role: user.role,
            email: user.email || null,
            phone: user.phone || null
        };
        req.session.save((saveError) => {
            if (saveError) return reject(saveError);
            return resolve();
        });
    });
});

// Đăng ký tài khoản bằng email bắt buộc và số điện thoại tùy chọn.
const registerUser = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = normalizeIdentifier(req.body?.email).toLowerCase();
    const phone = normalizePhone(req.body?.phone);
    const gender = String(req.body?.gender || '');
    const password = String(req.body?.password || '');

    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 80 ký tự.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ message: 'Vui lòng nhập địa chỉ email hợp lệ.' });
    }
    if (!isValidPhone(phone)) {
        return res.status(400).json({ message: 'Số điện thoại cần có từ 8 đến 15 chữ số.' });
    }
    if (!['Nam', 'Nữ', 'Khác'].includes(gender)) {
        return res.status(400).json({ message: 'Vui lòng chọn giới tính hợp lệ.' });
    }
    if (!hasStrongPassword(password)) {
        return res.status(400).json({
            message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt; tối đa 72 byte.'
        });
    }

    try {
        const duplicateFilter = phone ? { $or: [{ email }, { phone }] } : { email };
        const existingUser = await User.findOne(duplicateFilter).select('_id');
        if (existingUser) {
            return res.status(409).json({ message: 'Email hoặc số điện thoại này đã được đăng ký.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await User.create({
            hoTen: name,
            gioiTinh: gender,
            email,
            ...(phone ? { phone } : {}),
            trangThai: true,
            matKhau: passwordHash,
            role: 'user',
            profile: {}
        });

        return res.status(201).json({
            message: 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.'
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email hoặc số điện thoại này đã được đăng ký.' });
        }
        return sendServerError(res, error, 'Lỗi đăng ký tài khoản:');
    }
};

// Xác thực tài khoản người dùng hoặc quản trị viên qua cùng biểu mẫu và tạo phiên mới trên máy chủ.
const loginUser = async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const identifierFields = getIdentifierFields(identifier);
    const password = String(req.body?.password || '');

    if (!identifierFields || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email/số điện thoại và mật khẩu hợp lệ.' });
    }

    try {
        const user = await User.findOne({
            ...identifierFields,
            trangThai: true
        }).select('+matKhau');
        if (!user || !(await bcrypt.compare(password, user.matKhau))) {
            return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác.' });
        }

        const role = user.role;
        await setAuthenticatedSession(req, user);

        return res.json({
            message: 'Đăng nhập thành công.',
            user: {
                name: user.hoTen,
                role,
                email: user.email,
                phone: user.phone || null
            }
        });
    } catch (error) {
        return sendServerError(res, error, 'Lỗi đăng nhập:');
    }
};

// Hủy phiên trên máy chủ và xóa cookie phiên của trình duyệt.
const logoutUser = (req, res) => {
    req.session.destroy((error) => {
        if (error) return sendServerError(res, error, 'Lỗi đăng xuất:');
        res.clearCookie('connect.sid', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/'
        });
        return res.json({ message: 'Đăng xuất thành công.' });
    });
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword
};