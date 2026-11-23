const TinTuc = require('../models/newsModel');
const { syncTuoiTreNews } = require('../services/newsRssService');

// GET /api/news -> Trả danh sách tin cho giao diện news.js
exports.getAllNews = async (req, res) => {
    try {
        const newsList = await TinTuc.find({ trangThai: true })
            .sort({ pubDate: -1 });
        res.json({ success: true, data: newsList });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tin tức' });
    }
};

// POST /api/news/sync -> Gọi thủ công để cào tin ngay lập tức
exports.syncNews = async (req, res) => {
    try {
        const result = await syncTuoiTreNews();
        res.json({ success: true, message: 'Đồng bộ tin tức thành công!', result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi đồng bộ RSS' });
    }
};