const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const homeController = require('../controllers/homeController');
const chatbotController = require('../controllers/chatbotController');
const evaluationController = require('../controllers/evaluationController');
const adminController = require('../controllers/adminController');
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
router.post('/api/evaluation/submit', requireAuth, evaluationController.submitEvaluation);

// Phân hệ Quản trị viên
router.get('/admin', requireAdmin, adminController.getAdminDashboard);
router.get('/api/admin/consultation-stats', requireAdmin, adminController.getConsultationStatsAPI);
router.get('/api/admin/major-detail/:majorName', requireAdmin, adminController.getMajorDetailAPI);
router.get('/api/admin/all-recommended-majors', adminController.getAllRecommendedMajorsAPI);
router.get('/api/admin/realtime-metrics', requireAdmin, adminController.getRealtimeMetricsAPI);
router.patch('/api/admin/users/:id/toggle-status', requireAdmin, adminController.toggleUserStatusAPI);
router.patch('/api/admin/users/batch-status', requireAdmin, adminController.batchUpdateUserStatusAPI);

module.exports = router;



