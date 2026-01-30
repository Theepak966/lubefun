var config = require('@/config/config.js');

exports.authorizeAccount = async (req, res) => {
    var returnUrl = req.query.returnUrl || '/';

    var authorized = false;

    if(req.session.authorizedAccount) {
        authorized = req.session.authorizedAccount;
        delete req.session.authorizedAccount;
    }

    if(authorized) return res.redirect(returnUrl);

    res.render('auth/authorizeAccount', {
        layout: 'layouts/auth',
        name: config.app.pages['authorize'],
        response: { returnUrl }
    });
};

exports.authorizeAdmin = async (req, res) => {
    var returnUrl = req.query.returnUrl || '/';

    var authorized = false;

    if(req.session.authorizedAdmin) {
        authorized = req.session.authorizedAdmin;
        delete req.session.authorizedAdmin;
    }

    if(authorized) return res.redirect(returnUrl);

    res.render('auth/authorizeAdmin', {
        layout: 'layouts/auth',
        name: config.app.pages['authorize'],
        response: { returnUrl }
    });
};