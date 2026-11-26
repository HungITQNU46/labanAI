const User = require('../models/accModel');

// Chỉ cho phép tài khoản đã đăng nhập truy cập các chức năng cần xác thực.
const requireAuth = (req, res, next) => {
    if (req.session?.user) return next();
    return res.redirect('/?auth=login');
};

function sendAdminAuthFailure(req, res, status, message, redirect) {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(status).json({ success: false, message });
    }
    return res.redirect(redirect);
}

// Chỉ cho phép admin còn hiệu lực trong cơ sở dữ liệu truy cập; thu hồi luôn phiên đã bị hạ quyền.
const requireAdmin = async (req, res, next) => {
    if (!req.session?.user) {
        return sendAdminAuthFailure(req, res, 401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', '/?auth=login');
    }
    const admin = await User.findOne({
        _id: req.session.user.id,
        role: 'admin',
        trangThai: true
    }).select('_id').lean();

    if (!admin) {
        return req.session.destroy((error) => {
            if (error) return next(error);
            res.clearCookie('connect.sid', {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/'
            });
            return sendAdminAuthFailure(req, res, 403, 'Tài khoản không còn quyền quản trị.', '/');
        });
    }

    return next();
};

module.exports = { requireAuth, requireAdmin };
