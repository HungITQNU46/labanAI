const bcrypt = require('bcryptjs');
const User = require('../models/accModel');
const { hasStrongPassword } = require('../utils/passwordPolicy');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;

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

const setAuthenticatedSession = (req, user) => new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
        if (error) return reject(error);
        req.session.user = {
            id: user.id,
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

module.exports = { registerUser, loginUser, logoutUser };