const Chatbot = require('../models/chatbotModel');
const { generateChatReply } = require('../config/aiConfig');
const { buildPersonalizedSystemPrompt } = require('../services/chatContextService');

function getUserId(req) {
    return String(req.session?.user?.id || req.session?.user?._id || '');
}

const getChatbot = (req, res) => {
    res.render('pages/chatbot', { title: 'ChatBot AI Tư Vấn Chọn Ngành' });
};

// GET /api/chatbot/sessions
const listSessions = async (req, res) => {
    try {
        const userId = getUserId(req);
        const sessions = await Chatbot.find({ id_nguoiDung: userId })
            .sort({ ngayCapNhat: -1 })
            .limit(30)
            .lean();
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Lỗi lấy danh sách chat:', error);
        res.status(500).json({ success: false, message: 'Không thể tải lịch sử trò chuyện.' });
    }
};

// POST /api/chatbot/sessions
const createSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        const cheDo = ['general', 'score', 'holland'].includes(req.body?.cheDo) ? req.body.cheDo : 'general';
        const session = await Chatbot.create({
            id_nguoiDung: userId,
            tieuDe: 'Cuộc trò chuyện mới',
            cheDo,
            tinNhan: []
        });
        res.status(201).json({ success: true, data: session });
    } catch (error) {
        console.error('Lỗi tạo phiên chat:', error);
        res.status(500).json({ success: false, message: 'Không thể tạo cuộc trò chuyện mới.' });
    }
};

// POST /api/chatbot/sessions/:id/messages
const sendMessage = async (req, res) => {
    try {
        const userId = getUserId(req);
        const content = String(req.body?.content || '').trim();
        const mode = ['general', 'score', 'holland'].includes(req.body?.cheDo) ? req.body.cheDo : 'general';

        if (!content) {
            return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống.' });
        }

        const session = await Chatbot.findOne({ _id: req.params.id, id_nguoiDung: userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện.' });
        }

        // Lấy tối đa 10 tin nhắn gần nhất làm ngữ cảnh hội thoại
        const recentHistory = session.tinNhan.slice(-10);
        const systemInstruction = await buildPersonalizedSystemPrompt(userId, mode);

        const aiReply = await generateChatReply({
            systemInstruction,
            history: recentHistory,
            userMessage: content
        });

        // Tự đặt tiêu đề nếu là tin nhắn đầu tiên
        if (session.tinNhan.length === 0) {
            session.tieuDe = content.length > 40 ? content.slice(0, 40) + '...' : content;
        }
        session.cheDo = mode;
        session.tinNhan.push({ role: 'user', content });
        session.tinNhan.push({ role: 'assistant', content: aiReply });
        await session.save();

        res.json({
            success: true,
            data: {
                reply: aiReply,
                session
            }
        });
    } catch (error) {
        console.error('Lỗi gửi tin nhắn Gemini:', error);
        res.status(500).json({ success: false, message: 'AI đang bận hoặc lỗi kết nối. Bạn thử lại sau nhé!' });
    }
};

// PATCH /api/chatbot/sessions/:id
const renameSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        const tieuDe = String(req.body?.tieuDe || '').trim();
        if (!tieuDe) return res.status(400).json({ success: false, message: 'Tiêu đề không hợp lệ.' });

        const session = await Chatbot.findOneAndUpdate(
            { _id: req.params.id, id_nguoiDung: userId },
            { tieuDe: tieuDe.slice(0, 120) },
            { returnDocument: 'after' }
        );
        if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện.' });
        res.json({ success: true, data: session });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể đổi tên cuộc trò chuyện.' });
    }
};

// DELETE /api/chatbot/sessions/:id
const deleteSession = async (req, res) => {
    try {
        const userId = getUserId(req);
        await Chatbot.deleteOne({ _id: req.params.id, id_nguoiDung: userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể xóa cuộc trò chuyện.' });
    }
};

// DELETE /api/chatbot/sessions
const clearAllSessions = async (req, res) => {
    try {
        const userId = getUserId(req);
        await Chatbot.deleteMany({ id_nguoiDung: userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể xóa toàn bộ lịch sử.' });
    }
};

module.exports = {
    getChatbot,
    listSessions,
    createSession,
    sendMessage,
    renameSession,
    deleteSession,
    clearAllSessions
};