// Kết quả đánh giá
const mongoose = require('mongoose');

const ketQuaDanhGiaSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        alias: 'id'
    },
    id_nguoiDung: {
        type: String,
        required: true,
        ref: 'User',
        trim: true
    },
    nganhHoc: {
        type: [{
            type: String,
            trim: true
        }],
        required: true
    },
    tiLe: {
        type: [Number],
        required: true
    }
}, {
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.KetQuaDanhGia || mongoose.model('KetQuaDanhGia', ketQuaDanhGiaSchema);
