const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const crypto = require('crypto');
const Admission = require('./src/models/admModel');
const admissionSeedData = require('./data/admissionSeedData');
const cron = require('node-cron');
const { syncTuoiTreNews } = require('./src/services/newsRssService');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI?.trim();
if (!mongoUri) {
  throw new Error('MONGO_URI chưa được cấu hình. Hãy tạo file .env từ .env.example và điền URI MongoDB.');
}

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
    mongoUrl: mongoUri,
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

// Expose preview state dynamically to all views
app.use((req, res, next) => {
  res.locals.isPreviewDev = process.env.NODE_ENV === 'development' && process.env.LABANAI_RIASEC27_PREVIEW === 'true';
  next();
});

// Sử dụng định tuyến
app.use('/', webRoutes);

app.use('/api/admin', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy API quản trị: ${req.method} ${req.path}`
  });
});

app.use('/api/admin', (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Nội dung yêu cầu không phải JSON hợp lệ.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Dữ liệu gửi lên vượt giới hạn 10 KB.' });
  }
  console.error('Lỗi API quản trị:', error);
  return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý yêu cầu quản trị.' });
});

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

async function startServer() {
  await mongoose.connect(mongoUri);
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
  // Chạy cào tin 1 lần sau khi đã kết nối DB thành công
  syncTuoiTreNews();
  // Lên lịch tự động cào lại vào phút thứ 0 mỗi giờ
  cron.schedule('0 * * * *', () => {
    syncTuoiTreNews();
  });

  const serverArgs = HOST ? [PORT, HOST] : [PORT];
  app.listen(...serverArgs, () => {
    const displayHost = (HOST === '0.0.0.0' || !HOST) ? 'localhost' : HOST;
    console.log(`🚀 Server La Bàn AI đang chạy tại: http://${displayHost}:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error(' Lỗi khởi động server hoặc khởi tạo dữ liệu tuyển sinh:', err);
    process.exitCode = 1;
  });
}

module.exports = app;