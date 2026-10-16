const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const crypto = require('crypto');
const Admission = require('./src/models/admModel');
const admissionSeedData = require('./data/admissionSeedData');
require('dotenv').config();

const app = express();
const webRoutes = require('./src/routes/web');

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET phải được cấu hình trong môi trường production.');
  }
  console.warn('SESSION_SECRET chưa được cấu hình; phiên đăng nhập sẽ mất hiệu lực khi khởi động lại.');
}

// Cấu hình View Engine là EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Cấu hình thư mục Public chứa Static Assets (CSS, JS, Hình ảnh)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(session({
  name: 'connect.sid',
  secret: sessionSecret,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Sử dụng định tuyến
app.use('/', webRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await mongoose.connect(process.env.MONGO_URI);
  await Admission.bulkWrite(admissionSeedData.map(({ _id, ...admission }) => ({
    updateOne: {
      filter: { _id },
      update: { $setOnInsert: { _id, ...admission } },
      upsert: true
    }
  })));
  await Admission.collection.updateMany(
    {
      $or: [
        { schoolName: { $exists: true } },
        { schoolCode: { $exists: true } },
        { region: { $exists: true } },
        { majorName: { $exists: true } },
        { majorCode: { $exists: true } },
        { majorGroup: { $exists: true } },
        { group: { $exists: true } },
        { method: { $exists: true } },
        { type: { $exists: true } },
        { cutoff2023: { $exists: true } },
        { cutoff2024: { $exists: true } },
        { cutoff2025: { $exists: true } },
        { predictedCutoff: { $exists: true } },
        { probability: { $exists: true } },
        { risk: { $exists: true } },
        { avatarBg: { $exists: true } }
      ]
    },
    {
      $rename: {
        schoolName: 'tenTruong',
        schoolCode: 'maTruong',
        region: 'khuVuc',
        majorName: 'tenNganh',
        majorCode: 'maNganh',
        majorGroup: 'nhomNganh',
        group: 'toHop',
        method: 'phuongThuc',
        type: 'loaiTruong',
        cutoff2023: 'diemChuan2023',
        cutoff2024: 'diemChuan2024',
        cutoff2025: 'diemChuan2025',
        predictedCutoff: 'diemChuanDuKien',
        probability: 'xacSuat',
        risk: 'mucDoRuiRo',
        avatarBg: 'mauNenAnh'
      }
    }
  );
  console.log(' Kết nối MongoDB Atlas thành công!');
  app.listen(PORT, () => {
    console.log(`🚀 Server La Bàn AI đang chạy tại: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error(' Lỗi khởi động server hoặc khởi tạo dữ liệu tuyển sinh:', err);
  process.exitCode = 1;
});