const requireAuth = (req, res, next) => {
    if (req.session?.user) return next();
    return res.redirect('/?auth=login');
};

const requireAdmin = (req, res, next) => {
    if (!req.session?.user) return res.redirect('/?auth=login');
    if (req.session.user.role !== 'admin') return res.redirect('/');
    return next();
};

module.exports = { requireAuth, requireAdmin };
