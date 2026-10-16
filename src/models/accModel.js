const mongoose = require('mongoose');

const taiKhoanSchema = new mongoose.Schema({
    hoTen: {
        type: String,
        required: true,
        trim: true
    },
    gioiTinh: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
        sparse: true,
        default: undefined
    },
    trangThai: {
        type: Boolean,
        required: true,
        default: true
    },
    matKhau: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        required: true
    },
    profile: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({})
    }
}, {
    timestamps: true,
    id: false,
    toJSON: {
        virtuals: true,
        transform(_document, result) {
            delete result.matKhau;
            return result;
        }
    },
    toObject: {
        virtuals: true,
        transform(_document, result) {
            delete result.matKhau;
            return result;
        }
    }
});

module.exports = mongoose.models.User || mongoose.model('User', taiKhoanSchema);
