const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ['user', 'assistant']
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false
});

const chatbotSchema = new mongoose.Schema({
    id_nguoiDung: {
        type: String,
        required: true,
        ref: 'User',
        trim: true
    },
    tieuDe: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
        default: 'Cuộc trò chuyện mới'
    },
    cheDo: {
        type: String,
        enum: ['general', 'score', 'holland'],
        default: 'general',
        required: true
    },
    tinNhan: {
        type: [messageSchema],
        default: []
    }
}, {
    timestamps: {
        createdAt: 'ngayTao',
        updatedAt: 'ngayCapNhat'
    }
});

chatbotSchema.index({ id_nguoiDung: 1, ngayCapNhat: -1 });

module.exports = mongoose.models.Chatbot || mongoose.model('Chatbot', chatbotSchema);