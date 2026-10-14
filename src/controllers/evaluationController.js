const hollandQuestionStore = require('../models/hollandQuestionStore');

const getEvaluation = async (req, res) => {
    const hollandQuestions = await hollandQuestionStore.getQuestions();
    res.render('pages/evaluation', { 
        title: 'Đánh giá năng lực & Dự đoán trúng tuyển',
        questionsData: JSON.stringify(hollandQuestions).replace(/[<>&]/g, (character) => ({
            '<': '\\u003c',
            '>': '\\u003e',
            '&': '\\u0026'
        })[character])
    });
};

module.exports = { getEvaluation };