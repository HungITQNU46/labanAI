// Tuyển sinh
const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
        alias: 'id'
    },
    tenTruong: {
        type: String,
        required: true,
        trim: true
    },
    maTruong: {
        type: String,
        required: true,
        trim: true
    },
    khuVuc: {
        type: String,
        required: true,
        enum: ['north', 'central', 'south']
    },
    tenNganh: {
        type: String,
        required: true,
        trim: true
    },
    maNganh: {
        type: String,
        required: true,
        trim: true
    },
    nhomNganh: {
        type: String,
        required: true,
        enum: ['it', 'econ', 'eng', 'health']
    },
    toHop: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    phuongThuc: {
        type: String,
        required: true,
        enum: ['thpt', 'hocba', 'dgnl', 'kethop']
    },
    loaiTruong: {
        type: String,
        required: true,
        trim: true
    },
    diemChuan2023: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    diemChuan2024: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    diemChuan2025: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    diemChuanDuKien: {
        type: Number,
        required: true,
        min: 0,
        max: 30
    },
    xacSuat: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    mucDoRuiRo: {
        type: String,
        required: true,
        enum: ['safe', 'moderate', 'dream']
    },
    mauNenAnh: {
        type: String,
        required: true,
        trim: true
    }
}, {
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);
