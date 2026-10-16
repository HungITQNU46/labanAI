const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 80
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    passwordHash: {
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
}, { timestamps: true });

userSchema.pre('validate', function validateIdentifier() {
    if (!this.email && !this.phone) {
        this.invalidate('email', 'Tài khoản cần có email hoặc số điện thoại.');
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
