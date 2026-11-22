const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const webRoutes = require('./src/routes/web');

// Cấu hình View Engine là EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Cấu hình thư mục Public chứa Static Assets (CSS, JS, Hình ảnh)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10kb' }));

// Expose preview state dynamically to all views
app.use((req, res, next) => {
    res.locals.isPreviewDev = process.env.NODE_ENV === 'development' && process.env.LABANAI_RIASEC27_PREVIEW === 'true';
    next();
});

// Sử dụng định tuyến
app.use('/', webRoutes);

// Keep API validation errors JSON-only and avoid reflecting submitted answers.
app.use(['/api/ml', '/api/riasec27'], (error, req, res, next) => {
    if (!['entity.parse.failed', 'entity.too.large'].includes(error.type)) return next(error);
    res.set('Cache-Control', 'no-store');
    const oversized = error.type === 'entity.too.large';
    res.status(oversized ? 413 : 400).json({
        error: oversized ? 'PAYLOAD_TOO_LARGE' : 'INVALID_JSON',
        message: oversized ? 'Dữ liệu gửi lên vượt giới hạn 10 KB.' : 'Nội dung yêu cầu phải là JSON hợp lệ.'
    });
});

const PORT = process.env.PORT || 3000;
const isPreviewDev = process.env.NODE_ENV === 'development' && process.env.LABANAI_RIASEC27_PREVIEW === 'true';
const HOST = isPreviewDev ? '127.0.0.1' : (process.env.HOST || undefined);
if (require.main === module) {
    const serverArgs = HOST ? [PORT, HOST] : [PORT];
    app.listen(...serverArgs, () => {
        const displayHost = (HOST === '0.0.0.0' || !HOST) ? '127.0.0.1' : HOST;
        console.log(`🚀 Server La Bàn AI đang chạy tại: http://${displayHost}:${PORT}`);
    });
}

module.exports = app;
