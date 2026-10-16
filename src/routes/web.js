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

// Các trang tĩnh & Thông tin
router.get('/', homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/guide', homeController.getGuide);
router.get('/news', homeController.getNews);

// Phân hệ Chatbot AI
router.get('/chatbot', requireAuth, chatbotController.getChatbot);

// Phân hệ Đánh giá năng lực & Dự đoán
router.get('/evaluation', requireAuth, evaluationController.getEvaluation);

// Phân hệ Quản trị viên
router.get('/admin', requireAdmin, adminController.getAdminDashboard);

module.exports = router;