const hollandQuestionStore = require('../services/hollandQuestionService');
const Admission = require('../models/admModel');

const getEvaluation = async (req, res) => {
    const [hollandQuestions, admissions] = await Promise.all([
        hollandQuestionStore.getQuestions(),
        Admission.find().sort({ maTruong: 1, maNganh: 1 })
    ]);
    const serializeForInlineJson = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
        '<': '\\u003c',
        '>': '\\u003e',
        '&': '\\u0026'
    })[character]);

    res.render('pages/evaluation', {
        title: 'Đánh giá năng lực & Dự đoán trúng tuyển',
        questionsData: serializeForInlineJson(hollandQuestions),
        admissionsData: serializeForInlineJson(admissions.map((admission) => admission.toJSON()))
    });
};

module.exports = { getEvaluation };