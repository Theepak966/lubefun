var authentication = async (req, res, next) => {
    if(req.session.authenticationToken) {
        var returnUrl = req.query.returnUrl || req.path || '/';

        var token = req.session.authenticationToken;
        delete req.session.authenticationToken;

        return res.redirect('/twofa?returnUrl=' + returnUrl + '&token=' + token);
    }

    next();
};

module.exports = authentication;