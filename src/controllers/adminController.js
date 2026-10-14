// Hiển thị trang trung tâm điều khiển sau khi quản trị viên đăng nhập thành công.
const getAdminDashboard = (req, res) => {
    res.render('pages/admin-dashboard', {
        title: 'Trung tâm điều khiển'
    });
};

module.exports = { getAdminDashboard };
