var config = require('@/config/config.js');

exports.tos = async (req, res) => {
    res.render('tos', {
        page: 'tos',
        name: config.app.pages['tos']
    });
};