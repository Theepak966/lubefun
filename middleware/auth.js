var auth = async (req, res, next) => {
    if(!res.locals.user) return next();

    if(req.path.includes('/register/set-password')) return next();
    if(req.path.includes('/register/set-email')) return next();

    if(!res.locals.user.password) return res.redirect('/register/set-password?returnUrl=' + req.path);
    if(!res.locals.user.email) return res.redirect('/register/set-email?returnUrl=' + req.path);

    next();
};

module.exports = auth;