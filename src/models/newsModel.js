//tin tuc
const mongoose = require('mongoose');

const tinTucSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        alias: 'id'
    },
    html_str: {
        type: String,
        required: true
    },
    trangThai: {
        type: Boolean,
        required: true
    }
}, {
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.TinTuc || mongoose.model('TinTuc', tinTucSchema);
