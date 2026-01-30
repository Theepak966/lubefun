var { pool } = require('@/lib/database.js');
var { emitSocketToUser } = require('@/lib/socket.js');

var userService = require('@/services/userService.js');

var { getFormatAmount, getFormatAmountString } = require('@/utils/formatAmount.js');
var { verifyRecaptcha } = require('@/utils/utils.js');

/* ----- CLIENT USAGE ----- */
function collectRewards(user, socket, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `referral_codes` WHERE `userid` = ' + pool.escape(user.userid), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while collenting rewards (1)'
                });

				return cooldown(false, true);
			}

			if(row1.length == 0) {
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You don\'t have a code to collect the available coins!'
				});

				return cooldown(false, true);
			}

			var available = getFormatAmount(row1[0].available);

			if(available <= 0) {
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You don\'t have available coins to collect!'
				});

				return cooldown(false, true);
			}

			pool.query('UPDATE `referral_codes` SET `collected` = `collected` + ' + available + ', `available` = `available` - ' + available + ' WHERE `userid` = ' + pool.escape(user.userid), function(err2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while collenting rewards (2)'
                    });

					return cooldown(false, true);
				}

				//EDIT BALANCE
				userService.editBalance(user.userid, available, 'affiliates_rewards', function(err3, newbalance){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
                            message: err3.message
                        });

						return cooldown(false, true);
					}

                    pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + available + ' WHERE `userid` = ' + pool.escape(user.userid), function(err4){
                        if(err4) {
                            emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while collenting rewards (3)'
                            });

                            return cooldown(false, true);
                        }

                        emitSocketToUser(socket, 'site', 'refresh');

                        emitSocketToUser(socket, 'message', 'success', {
                            message: 'You collected ' + getFormatAmountString(available) + ' coins!'
                        });

                        userService.updateBalance(user.userid, 'main', newbalance);

                        cooldown(false, false);
				    });
				});
			});
		});
	});
}

module.exports = {
	collectRewards
};