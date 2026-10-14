const getIndex = (req, res) => {
    res.render('pages/index', { title: 'Trang Chủ' });
};

const getAbout = (req, res) => {
    res.render('pages/about', { title: 'Về Chúng Tôi' });
};

const getGuide = (req, res) => {
    res.render('pages/guide', { title: 'Hướng Dẫn Sử Dụng' });
};

const getNews = (req, res) => {
    res.render('pages/news', { title: 'Cẩm Nang Hướng Nghiệp & Tin Tuyển Sinh' });
};

module.exports = { getIndex, getAbout, getGuide, getNews };