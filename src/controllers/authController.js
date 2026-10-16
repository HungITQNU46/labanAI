const bcrypt = require('bcryptjs');
const User = require('../models/userModel');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const HAS_LOWERCASE = /\p{Ll}/u;
const HAS_UPPERCASE = /\p{Lu}/u;
const HAS_NUMBER = /\p{N}/u;
const HAS_SPECIAL_CHARACTER = /[^\p{L}\p{N}\s]/u;

const normalizeIdentifier = (value) => String(value || '').trim();

const hasStrongPassword = (password) => (
    password.length >= 8
    && Buffer.byteLength(password, 'utf8') <= 72
    && HAS_LOWERCASE.test(password)
    && HAS_UPPERCASE.test(password)
    && HAS_NUMBER.test(password)
    && HAS_SPECIAL_CHARACTER.test(password)
);

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
            name: user.name,
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

// Đăng ký tài khoản mới bằng email hoặc số điện thoại.
const registerUser = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const identifierFields = getIdentifierFields(normalizeIdentifier(req.body?.identifier));
    const password = String(req.body?.password || '');

    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ message: 'Họ tên phải có từ 2 đến 80 ký tự.' });
    }
    if (!identifierFields) {
        return res.status(400).json({ message: 'Vui lòng nhập email hợp lệ hoặc số điện thoại gồm 8–15 chữ số.' });
    }
    if (!hasStrongPassword(password)) {
        return res.status(400).json({
            message: 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt; tối đa 72 byte.'
        });
    }

    try {
        const existingUser = await User.findOne(identifierFields).select('_id');
        if (existingUser) {
            return res.status(409).json({ message: 'Email hoặc số điện thoại này đã được đăng ký.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await User.create({
            ...identifierFields,
            name,
            passwordHash,
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

// Xác thực thông tin đăng nhập và tạo phiên làm việc mới trên máy chủ.
const loginUser = async (req, res) => {
    const identifierFields = getIdentifierFields(normalizeIdentifier(req.body?.identifier));
    const password = String(req.body?.password || '');

    if (!identifierFields || !password) {
        return res.status(400).json({ message: 'Vui lòng nhập email/số điện thoại và mật khẩu hợp lệ.' });
    }

    try {
        const user = await User.findOne(identifierFields).select('+passwordHash');
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Thông tin đăng nhập không chính xác.' });
        }

        const role = user.role;
        await setAuthenticatedSession(req, user);

        return res.json({
            message: 'Đăng nhập thành công.',
            user: {
                name: user.name,
                role,
                email: user.email || null,
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