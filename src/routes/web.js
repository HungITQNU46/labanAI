const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const chatbotController = require('../controllers/chatbotController');
const evaluationController = require('../controllers/evaluationController');
const adminController = require('../controllers/adminController');

// Các trang tĩnh & Thông tin
router.get('/', homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/guide', homeController.getGuide);
router.get('/news', homeController.getNews);

// Phân hệ Chatbot AI
router.get('/chatbot', chatbotController.getChatbot);

// Phân hệ Đánh giá năng lực & Dự đoán
router.get('/evaluation', evaluationController.getEvaluation);

// Phân hệ Quản trị viên
router.get('/admin', adminController.getAdminDashboard);

module.exports = router;