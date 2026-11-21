const hollandQuestionStore = require('../models/hollandQuestionStore');
const mlModel = require('../models/mlModel');
const f54Questionnaire = require('../models/f54Questionnaire');

const jsonForHtml = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
})[character]);

const getEvaluation = async (req, res) => {
    const hollandQuestions = await hollandQuestionStore.getQuestions();
    res.render('pages/evaluation', { 
        title: 'Khảo sát F54 & Tham khảo ngành học',
        questionsData: jsonForHtml(hollandQuestions),
        f54QuestionnaireData: jsonForHtml({
            questionnaire_version: f54Questionnaire.questionnaire_version,
            questions: f54Questionnaire.questions,
            answer_scale: f54Questionnaire.answer_scale
        }),
        hollandInitiallyOpen: req.query.view === 'prediction'
    });
};

const getMlStatus = (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(mlModel.getStatus());
    } catch (error) {
        res.status(503).json({ available: false, error: 'ML_ARTIFACT_UNAVAILABLE', message: 'Model F54 đã xác minh hiện không khả dụng.' });
    }
};

const recommendMajors = (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(mlModel.recommend(req.body));
    } catch (error) {
        const invalidInput = error instanceof mlModel.MlInputError;
        res.status(invalidInput ? 400 : 503).json({
            error: invalidInput ? 'INVALID_F54_INPUT' : 'ML_ARTIFACT_UNAVAILABLE',
            message: invalidInput ? error.message : 'Model F54 đã xác minh hiện không khả dụng.'
        });
    }
};

module.exports = { getEvaluation, getMlStatus, recommendMajors };
