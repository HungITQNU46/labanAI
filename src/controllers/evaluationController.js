/**
 * evaluationController.js
 *
 * Controller for Career Evaluation page and ML inference endpoints.
 * Direction B: RIASEC27 + 6 ML models + Top-3 majors.
 */

'use strict';

const mlModel = require('../models/mlModel');
const riasec27Service = require('../services/riasec27Service');
const { isPreviewEnabled, isLoopbackAddress, isValidLocalhostHost } = require('../middleware/riasec27PreviewGate');

const jsonForHtml = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
})[character]);

const getEvaluation = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const remoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
    const isLoopback = isLoopbackAddress(remoteIp);
    const isValidHost = isValidLocalhostHost(req.headers.host);
    const isAllowedPreview = isPreviewEnabled() && isLoopback && isValidHost;

    if (isAllowedPreview) {
        // In valid local development preview, render the 27 RIASEC survey directly
        const questionnaire = riasec27Service.getQuestionnaire();
        return res.render('pages/evaluation', {
            title: 'Định hướng nghề nghiệp bằng AI',
            questionnaireData: jsonForHtml(questionnaire),
            researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED',
            isAllowedPreview: true
        });
    }

    // Outside a valid local preview, do not expose the research survey.
    return res.render('pages/evaluation', {
        title: 'Định hướng nghề nghiệp bằng AI',
        questionnaireData: 'null',
        researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED',
        isAllowedPreview: false
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
