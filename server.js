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

// Sử dụng định tuyến
app.use('/', webRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server La Bàn AI đang chạy tại: http://localhost:${PORT}`);
});