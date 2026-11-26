const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const homeController = require('../controllers/homeController');
const chatbotController = require('../controllers/chatbotController');
const evaluationController = require('../controllers/evaluationController');
const evaluationHistoryController = require('../controllers/evaluationHistoryController');
const adminController = require('../controllers/adminController');
const newsAdminController = require('../controllers/newsAdminController');
const riasec27Controller = require('../controllers/riasec27Controller');
const { riasec27PreviewGate } = require('../middleware/riasec27PreviewGate');

const newsController = require('../controllers/newsController');//tintuc

const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Xác thực tài khoản
router.post('/auth/register', authController.registerUser);
router.post('/auth/login', authController.loginUser);
router.post('/auth/logout', authController.logoutUser);
router.post('/auth/forgot-password', authController.requestPasswordReset);
router.post('/auth/verify-reset-code', authController.verifyPasswordResetCode);
router.post('/auth/reset-password', authController.resetPassword);

// Các trang tĩnh & Thông tin
router.get('/', homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/guide', homeController.getGuide);
router.get('/news', homeController.getNews);

// Phân hệ Chatbot AI
router.get('/chatbot', requireAuth, chatbotController.getChatbot);

// Phân hệ Đánh giá năng lực & Dự đoán
router.get('/evaluation', requireAuth, evaluationController.getEvaluation);
router.get('/evaluation/history', requireAuth, evaluationHistoryController.getEvaluationHistory);
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
router.get('/admin', requireAdmin, adminController.getAdminDashboard);
router.get('/api/admin/consultation-stats', requireAdmin, adminController.getConsultationStatsAPI);
router.get('/api/admin/major-detail/:majorName', requireAdmin, adminController.getMajorDetailAPI);
router.get('/api/admin/all-recommended-majors', requireAdmin, adminController.getAllRecommendedMajorsAPI);
router.get('/api/admin/realtime-metrics', requireAdmin, adminController.getRealtimeMetricsAPI);
router.patch('/api/admin/users/:id/toggle-status', requireAdmin, adminController.toggleUserStatusAPI);
router.patch('/api/admin/users/batch-status', requireAdmin, adminController.batchUpdateUserStatusAPI);
router.get('/api/admin/news', requireAdmin, newsAdminController.listNews);
router.post('/api/admin/news', requireAdmin, newsAdminController.createNews);
router.get('/api/admin/news/:id', requireAdmin, newsAdminController.getNews);
router.patch('/api/admin/news/:id', requireAdmin, newsAdminController.updateNews);
router.patch('/api/admin/news/:id/status', requireAdmin, newsAdminController.setNewsStatus);
router.delete('/api/admin/news/:id', requireAdmin, newsAdminController.deleteNews);
router.post('/api/admin/news/sync', requireAdmin, newsController.syncNews);

router.get('/api/news', newsController.getAllNews);
router.post('/api/news/sync', requireAdmin, newsController.syncNews);
router.get('/api/news/:id', newsController.getNewsDetail); //tintuc

module.exports = router;
