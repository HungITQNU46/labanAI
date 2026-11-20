const mongoose = require('mongoose');

const tinTucSchema = new mongoose.Schema({
    _id: { type: String, required: true, alias: 'id' },
    title: { type: String, required: true },
    link: { type: String, required: true, unique: true }, // Dùng link để chống lưu trùng bài
    snippet: { type: String, default: '' },
    image: { type: String, default: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80' },
    author: { type: String, default: 'Báo Tuổi Trẻ' },
    pubDate: { type: Date, default: Date.now },
    category: { type: String, default: 'admission' }, // trend, guide, admission, review, expert
    categoryName: { type: String, default: 'Thông tin tuyển sinh' },
    industry: { type: String, default: 'all' },       // tech, business, medical, design, language
    block: { type: String, default: 'all' },          // A00, A01, D01, D07, B00
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    html_str: { type: String, required: true },       // Giữ lại trường gốc của nhóm
    trangThai: { type: Boolean, default: true }
}, {
    id: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.TinTuc || mongoose.model('TinTuc', tinTucSchema);