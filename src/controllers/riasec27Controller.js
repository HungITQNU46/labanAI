/**
 * riasec27Controller.js
 * 
 * Controller for Direction B RIASEC27 research preview and data endpoints.
 * Status: RESEARCH_ONLY — TOP3_NOT_VALIDATED.
 */

'use strict';

const riasec27Service = require('../services/riasec27Service');
const explanationService = require('../services/grokExplanation');
const historyService = require('../services/riasec27HistoryService');

const jsonForHtml = (value) => JSON.stringify(value).replace(/[<>&]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026'
})[character]);

const getPreviewPage = (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (typeof res.redirect === 'function') {
        return res.redirect(302, '/evaluation');
    }
    const questionnaire = riasec27Service.getQuestionnaire();
    res.render('pages/evaluation', {
        title: 'Định hướng nghề nghiệp bằng AI',
        questionnaireData: jsonForHtml(questionnaire),
        researchStatus: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED',
        isAllowedPreview: true
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
        const historyOptions = historyService.parseOptions(req.body, req.session?.user);
        const result = await riasec27Service.evaluateProfile(answers);
        const saved = await historyService.save(req.session?.user, historyOptions, answers, result.ml_ranking);
        // A replay returns the immutable saved snapshot, even after a model update.
        if (saved.snapshot) result.ml_ranking = saved.snapshot;
        result.history = {status:saved.status, ...(saved.id ? {id:saved.id} : {}), ...(saved.code ? {code:saved.code} : {})};
        // Additive metadata only; P2 output and the Python bridge contract remain intact.
        if (result.ml_ranking?.status === 'SUCCESS') {
            try { result.explanation_context_token = explanationService.mintContext({userId:req.session?.user?.id,sessionId:req.sessionID}, result.ml_ranking); }
            catch { result.explanation_context_token = null; } // AI must never break an ML result.
        }
        res.json(result);
    } catch (err) {
        if (err instanceof historyService.HistoryInputError) {
            return res.status(err.message === 'HISTORY_AUTH_REQUIRED' ? 401 : 400).json({error:err.message,message:'Không thể lưu lịch sử với yêu cầu này. Vui lòng kiểm tra đăng nhập và lựa chọn lưu.'});
        }
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

const explainResult = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        res.json(await explanationService.explain({userId:req.session?.user?.id,sessionId:req.sessionID}, req.body));
    } catch (error) {
        const known = error instanceof explanationService.ExplanationError;
        if (known && Number.isSafeInteger(error.retryAfterSeconds)) res.set('Retry-After', String(error.retryAfterSeconds));
        res.status(known ? error.status : 503).json({
            status: 'ERROR', error: known ? error.code : 'EXPLANATION_UNAVAILABLE',
            message: explanationService.UNAVAILABLE, research_status: 'RESEARCH_ONLY — TOP3_NOT_VALIDATED'
        });
    }
};

module.exports = {
    getPreviewPage,
    getQuestions,
    evaluateAnswers,
    explainResult,
    getCatalog,
    getThemes,
    exploreTier2
};
