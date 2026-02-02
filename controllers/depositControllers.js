var { pool } = require('@/lib/database.js');

var { haveRankPermission } = require('@/utils/utils.js');
var { getFormatAmountString } = require('@/utils/formatAmount.js');

var config = require('@/config/config.js');

exports.deposit = async (req, res, next) => {
    // Redirect to SOL by default
    if(Object.keys(config.settings.payments.methods.crypto).includes('sol') && 
       (config.settings.payments.methods.crypto.sol.enable.deposit || haveRankPermission('trade_disabled', res.locals.user ? res.locals.user.rank : 0))) {
        return res.redirect('/deposit/crypto/sol');
    }
    
    var response = {
        deposit: {
            enable: [
                'crypto'
            ].reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(config.settings.payments.methods[cur]).map(a => ({
                method: a,
                enable: config.settings.payments.methods[cur][a].enable.deposit,
                name: config.settings.payments.methods[cur][a].name
            })) }), {}),
            code: null
        }
    }

    if(!res.locals.user) return res.render('deposit', {
        page: 'deposit',
        name: config.app.pages['deposit'],
        response: response
    });

    pool.query('SELECT deposit_codes.code FROM `deposit_uses` INNER JOIN `deposit_codes` ON deposit_uses.bonusid = deposit_codes.id WHERE deposit_uses.userid = ' + pool.escape(res.locals.user.userid) + ' AND deposit_uses.removed = 0', function(err1, row1) {
		if(err1) return res.status(409).render('409', { layout: 'layouts/error', error: 'An error occurred while rendering deposit page (1)' });

        if(row1.length > 0) response.deposit.code = row1[0].code.toUpperCase();

        res.render('deposit', {
            page: 'deposit',
            name: config.app.pages['deposit'],
            response: response
        });
    });
};

exports.depositCrypto = async (req, res, next) => {
    if(!Object.keys(config.settings.payments.methods.crypto).includes(req.params.method)) return next();
    if(!config.settings.payments.methods.crypto[req.params.method].enable.deposit && !haveRankPermission('trade_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    res.render('depositCrypto', {
        page: 'deposit',
        name: config.app.pages['deposit'],
        response: {
            deposit: {
                name: config.settings.payments.methods.crypto[req.params.method].name,
                network: config.settings.payments.methods.crypto[req.params.method].network,
                amounts: {
                    min: config.app.intervals.amounts.deposit_crypto.min,
                    max: config.app.intervals.amounts.deposit_crypto.max
                }
            }
        }
    });
};