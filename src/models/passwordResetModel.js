const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    codeHash: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    resetTokenHash: {
        type: String,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0
    }
}, { timestamps: true });

module.exports = mongoose.models.PasswordReset
    || mongoose.model('PasswordReset', passwordResetSchema);
