const getChatbot = (req, res) => {
    res.render('pages/chatbot', { title: 'ChatBot AI Tư Vấn Chọn Ngành' });
};

module.exports = { getChatbot };