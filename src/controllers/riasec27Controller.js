/**
 * riasec27Controller.js
 * 
 * Controller for Direction B RIASEC27 research preview and data endpoints.
 * Status: RESEARCH_ONLY — TOP3_NOT_VALIDATED.
 */

'use strict';

const riasec27Service = require('../services/riasec27Service');

const jsonForHtml = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
})[character]);

const getPreviewPage = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const questionnaire = riasec27Service.getQuestionnaire();

    res.render('pages/riasec27Preview', {
        title: 'Khảo sát 27 câu RIASEC & Khám phá 33 Ngành (Preview Nội Bộ)',
        questionnaireData: jsonForHtml(questionnaire),
        researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED'
    });
};

const getQuestions = (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(riasec27Service.getQuestionnaire());
};

const evaluateAnswers = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'Yêu cầu phải có phần thân (body) dạng JSON hợp lệ.'
            });
        }
        const answers = req.body.answers;
        const result = await riasec27Service.evaluateProfile(answers);
        res.json(result);
    } catch (err) {
        if (err instanceof riasec27Service.Riasec27InputError) {
            return res.status(400).json({
                error: 'INVALID_RIASEC27_INPUT',
                message: err.message
            });
        }
        res.status(503).json({
            error: err.code || 'SERVICE_UNAVAILABLE',
            message: 'Không thể xử lý yêu cầu tính điểm ML Top-3 vào lúc này.'
        });
    }
};

const getCatalog = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const result = await riasec27Service.getCatalog();
        res.json(result);
    } catch (err) {
        res.status(503).json({
            error: err.code || 'CATALOG_UNAVAILABLE',
            message: 'Không thể tải sổ bộ danh mục 33 ngành.'
        });
    }
};

const getThemes = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const result = await riasec27Service.getThemes();
        res.json(result);
    } catch (err) {
        res.status(503).json({
            error: err.code || 'THEMES_UNAVAILABLE',
            message: 'Không thể tải các chủ đề phân hóa Tier 2.'
        });
    }
};

const exploreTier2 = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { theme_id, option_id, is_skip, major_id } = req.body || {};
        if (major_id) {
            const result = await riasec27Service.exploreMajor(major_id);
            return res.json(result);
        }
        const result = await riasec27Service.exploreTheme({ theme_id, option_id, is_skip });
        res.json(result);
    } catch (err) {
        if (err instanceof riasec27Service.Riasec27InputError) {
            return res.status(400).json({
                error: 'INVALID_EXPLORATION_INPUT',
                message: err.message
            });
        }
        res.status(503).json({
            error: err.code || 'EXPLORATION_UNAVAILABLE',
            message: 'Không thể xử lý yêu cầu khám phá định tính.'
        });
    }
};

module.exports = {
    getPreviewPage,
    getQuestions,
    evaluateAnswers,
    getCatalog,
    getThemes,
    exploreTier2
};
