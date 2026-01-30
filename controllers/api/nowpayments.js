var crypto = require('crypto');

var { sortObject } = require('@/utils/utils.js');

var cryptoService = require('@/services/trading/cryptoService.js');

var config = require('@/config/config.js');

function getSignature(body){
    var hmac = crypto.createHmac('sha512', config.trading.crypto.nowpayments.ipn_secret_key);
    hmac.update(JSON.stringify(sortObject(body)));

    var signature = hmac.digest('hex');

    return signature;
}

exports.callback = async (req, res) => {
    if(req.headers['x-nowpayments-sig'] === undefined) return res.sendStatus(403);

    var signature = getSignature(req.body);
    if(signature != req.headers['x-nowpayments-sig']) return res.sendStatus(403);

    cryptoService.updateTransaction(req.body, function(err1){
        if(err1) return res.sendStatus(409);

        res.sendStatus(200);
    });
};