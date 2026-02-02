var crypto = require('crypto');

var { pool } = require('@/lib/database.js');

var { haveRankPermission } = require('@/utils/utils.js');
var { getFormatAmountString } = require('@/utils/formatAmount.js');

var cryptoService = require('@/services/trading/cryptoService.js');

var config = require('@/config/config.js');

exports.withdraw = async (req, res) => {
    // Redirect to SOL by default
    if(Object.keys(config.settings.payments.methods.crypto).includes('sol') && 
       (config.settings.payments.methods.crypto.sol.enable.withdraw || haveRankPermission('trade_disabled', res.locals.user ? res.locals.user.rank : 0))) {
        return res.redirect('/withdraw/crypto/sol');
    }
    
    res.render('withdraw', {
        page: 'withdraw',
        name: config.app.pages['withdraw'],
        response: {
            withdraw: {
                enable: [
                'crypto'
            ].reduce((acc, cur) => ({ ...acc, [cur]: Object.keys(config.settings.payments.methods[cur]).map(a => ({
                    method: a,
                    enable: config.settings.payments.methods[cur][a].enable.withdraw,
                    name: config.settings.payments.methods[cur][a].name
                })) }), {})
            }
        }
    });
};

exports.withdrawCrypto = async (req, res, next) => {
    if(!Object.keys(config.settings.payments.methods.crypto).includes(req.params.method)) return next();
    if(!config.settings.payments.methods.crypto[req.params.method].enable.withdraw && !haveRankPermission('trade_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

    var fee = null;

    if(cryptoService.amounts[req.params.method] !== undefined && cryptoService.fees[req.params.method] !== undefined){
        if(cryptoService.amounts[req.params.method] > 0) fee = getFormatAmountString(cryptoService.amounts[req.params.method] * cryptoService.fees[req.params.method]);
    }

    res.render('withdrawCrypto', {
        page: 'withdraw',
        name: config.app.pages['withdraw'],
        response: {
            withdraw: {
                currency: config.settings.payments.methods.crypto[req.params.method].name,
                network: config.settings.payments.methods.crypto[req.params.method].network,
                fee: fee,
                amounts: {
                    min: config.app.intervals.amounts.withdraw_crypto.min,
                    max: config.app.intervals.amounts.withdraw_crypto.max
                },
                manually: {
                    amount: getFormatAmountString(config.settings.payments.manually.amount)
                }
            }
        }
    });
};