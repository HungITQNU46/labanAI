const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const chatbotController = require('../controllers/chatbotController');
const evaluationController = require('../controllers/evaluationController');
const adminController = require('../controllers/adminController');
const riasec27Controller = require('../controllers/riasec27Controller');
const { riasec27PreviewGate } = require('../middleware/riasec27PreviewGate');

// Các trang tĩnh & Thông tin
router.get('/', homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/guide', homeController.getGuide);
router.get('/news', homeController.getNews);

// Phân hệ Chatbot AI
router.get('/chatbot', chatbotController.getChatbot);

// Phân hệ Đánh giá năng lực & Dự đoán
router.get('/evaluation', evaluationController.getEvaluation);
router.get('/api/ml/status', evaluationController.getMlStatus);
router.post('/api/ml/recommendations', evaluationController.recommendMajors);

// Hướng B - Thử nghiệm nghiên cứu nội bộ RIASEC27 (B-06 Preview - Gate protected)
router.get('/evaluation/riasec27-preview', riasec27PreviewGate, riasec27Controller.getPreviewPage);
router.get('/api/riasec27/questions', riasec27PreviewGate, riasec27Controller.getQuestions);
router.post('/api/riasec27/evaluate', riasec27PreviewGate, riasec27Controller.evaluateAnswers);
router.post('/api/riasec27/explain', riasec27PreviewGate, riasec27Controller.explainResult);
router.get('/api/riasec27/catalog', riasec27PreviewGate, riasec27Controller.getCatalog);
router.get('/api/riasec27/themes', riasec27PreviewGate, riasec27Controller.getThemes);
router.post('/api/riasec27/explore', riasec27PreviewGate, riasec27Controller.exploreTier2);

// Phân hệ Quản trị viên
router.get('/admin', adminController.getAdminDashboard);

module.exports = router;
