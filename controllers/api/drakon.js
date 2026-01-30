var casinoService = require('@/services/games/casinoService.js');

var config = require('@/config/config.js');

exports.webhook = async (req, res) => {
    var method = req.body.method;

    if(method == 'account_details'){
        if(req.body.agent_code != config.games.games.casino.drakon.agent.code) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_token != config.games.games.casino.drakon.agent.token) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_secret_key != config.games.games.casino.drakon.agent.secret_key) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });

        casinoService.getUserDetails(req.body.user_id, function(err1, user){
            if(err1) return res.status(400).json({ 'status': false, 'error': err1 });

            res.status(200).json({ 'status': true, 'data': user });
        });
    } else if(method == 'user_balance'){
        if(req.body.agent_code != config.games.games.casino.drakon.agent.code) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_token != config.games.games.casino.drakon.agent.token) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_secret_key != config.games.games.casino.drakon.agent.secret_key) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });

        casinoService.getUserBalance(req.body.user_id, function(err1, balance){
            if(err1) return res.status(400).json({ 'status': false, 'error': err1 });

            res.status(200).json({ 'status': true, 'balance': balance });
        });
    } else if(method == 'transaction_bet'){
        if(req.body.agent_code != config.games.games.casino.drakon.agent.code) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_token != config.games.games.casino.drakon.agent.token) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_secret_key != config.games.games.casino.drakon.agent.secret_key) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });

        casinoService.placeBet(req.body.user_id, req.body.bet, req.body.transaction_id, req.body.round_id, req.body.game, function(err1, newbalance){
            if(err1) return res.status(400).json({ 'status': false, 'error': err1 });

            res.status(200).json({ 'status': true, 'balance': newbalance });
        });
    } else if(method == 'transaction_win'){
        if(req.body.agent_code != config.games.games.casino.drakon.agent.code) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_token != config.games.games.casino.drakon.agent.token) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });
        if(req.body.agent_secret_key != config.games.games.casino.drakon.agent.secret_key) return res.status(200).json({ 'status': false, 'error': 'INVALID_REQUEST' });

        casinoService.finishBet(req.body.user_id, req.body.win, req.body.round_id, function(err1, newbalance){
            if(err1) return res.status(400).json({ 'status': false, 'error': err1 });

            res.status(200).json({ 'status': true, 'balance': newbalance });
        });
    } else if(method == 'refund'){
        res.status(200).json({ 'status': false, 'error': 'INVALID_METHOD' });
    } else res.status(200).json({ 'status': false, 'error': 'INVALID_METHOD' });
};