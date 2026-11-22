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