var fs = require('fs');

var { pool } = require('@/lib/database.js');
var { emitSocketToUser, emitSocketToRoom } = require('@/lib/socket.js');
var { loggerError } = require('@/lib/logger.js');
var { uuid } = require('@/lib/uuid.js');

var userService = require('@/services/userService.js');

var coinflipService = require('@/services/games/coinflipService.js');

var cryptoService = require('@/services/trading/cryptoService.js');

var { makeDate, getTimeString, time } = require('@/utils/formatDate.js');
var { roundedToFixed, getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');
var { haveRankPermission, calculateLevel, escapeHTML, getColorByQuality, setObjectProperty, generateHexCode, getRandomInt, getAmountCommission, getSlug } = require('@/utils/utils.js');

var config = require('@/config/config.js');

var updating = {
	value: false
};

/* ----- INTERNAL USAGE ----- */
function saveSetting(path, value, callback){
	if(updating.value) return callback(new Error('An error occurred while saving settings (1)'));

	updating.value = true;

	var settings = { ...config.settings };

	setObjectProperty(settings, path, value);

	fs.writeFile('./settings.json', JSON.stringify(settings, null, 4), function(err1) {
		if(err1) {
            loggerError(err1);

			updating.value = false;

			return callback(new Error('An error occurred while saving settings (2)'));
		}

		config.settings = require('@/settings.json');

		updating.value = false;

		callback(null);
	});
}

/* ----- CLIENT USAGE ----- */
function setMaintenance(user, socket, status, reason, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `maintenance` WHERE `removed` = 0', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while setting maintenance (1)'
            });

			return cooldown(false, true);
		}

		if(status && row1.length > 0) {
			emitSocketToUser(socket, 'message', 'success', {
				message: 'Maintenance is already enabled!'
			});

			return cooldown(false, true);
		} else if(!status && row1.length <= 0) {
			emitSocketToUser(socket, 'message', 'success', {
				message: 'Maintenance is already disabled!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `maintenance` SET `removed` = 1 WHERE `removed` = 0', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while setting maintenance (2)'
                });

				return cooldown(false, true);
			}

			if(!status) {
				emitSocketToUser(socket, 'message', 'success', {
					message: 'Maintenance disabled!'
				});

				emitSocketToUser(socket, 'site', 'reload');

				return cooldown(false, true);
			}

			pool.query('INSERT INTO `maintenance` SET `userid` = ' + pool.escape(user.userid) + ', `reason` = ' + pool.escape(reason) + ', `time` = ' + pool.escape(time()), function(err3, row3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while setting maintenance (3)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Maintenance enabled!'
				});

				emitSocketToUser(socket, 'site', 'reload');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function setSettings(user, socket, settings, status, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	var settings_allowed = [
		'games_status',

        'games_games_original_crash_enable',
        'games_games_original_coinflip_enable',
        'games_games_original_blackjack_enable',
        'games_games_original_tower_enable',
        'games_games_original_minesweeper_enable',

        'games_games_classic_casino_enable',

        'games_casino_real',

        'games_bots_enable_coinflip',

        'payments_status',

        'payments_manually_enable_crypto',

        'payments_methods_crypto_btc_enable_deposit', 'payments_methods_crypto_eth_enable_deposit', 'payments_methods_crypto_ltc_enable_deposit', 'payments_methods_crypto_bch_enable_deposit', 'payments_methods_crypto_usdttrc20_enable_deposit', 'payments_methods_crypto_usdterc20_enable_deposit', 'payments_methods_crypto_usdtbsc_enable_deposit', 'payments_methods_crypto_usdtsol_enable_deposit', 'payments_methods_crypto_usdtmatic_enable_deposit', 'payments_methods_crypto_usdc_enable_deposit', 'payments_methods_crypto_ton_enable_deposit', 'payments_methods_crypto_trx_enable_deposit', 'payments_methods_crypto_doge_enable_deposit', 'payments_methods_crypto_xrp_enable_deposit', 'payments_methods_crypto_bnbbsc_enable_deposit', 'payments_methods_crypto_sol_enable_deposit', 'payments_methods_crypto_shibbsc_enable_deposit',
		'payments_methods_crypto_btc_enable_withdraw', 'payments_methods_crypto_eth_enable_withdraw', 'payments_methods_crypto_ltc_enable_withdraw', 'payments_methods_crypto_bch_enable_withdraw', 'payments_methods_crypto_usdttrc20_enable_withdraw', 'payments_methods_crypto_usdterc20_enable_withdraw', 'payments_methods_crypto_usdtbsc_enable_withdraw', 'payments_methods_crypto_usdtsol_enable_withdraw', 'payments_methods_crypto_usdtmatic_enable_withdraw', 'payments_methods_crypto_usdc_enable_withdraw', 'payments_methods_crypto_ton_enable_withdraw', 'payments_methods_crypto_trx_enable_withdraw', 'payments_methods_crypto_doge_enable_withdraw', 'payments_methods_crypto_xrp_enable_withdraw', 'payments_methods_crypto_bnbbsc_enable_withdraw', 'payments_methods_crypto_sol_enable_withdraw', 'payments_methods_crypto_shibbsc_enable_withdraw'

	];
	if(!settings_allowed.includes(settings)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid settings!'
		});

		return cooldown(false, true);
	}

	var settings_copy = { ...config.settings };
	settings.split('_').forEach(function(item){ settings_copy = settings_copy[item]; });

	if(settings_copy == status){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Property already setted!'
		});

		return cooldown(false, true);
	}

	saveSetting(settings.split('_').join('..'), status, function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
            });

			return cooldown(false, true);
		}

		emitSocketToUser(socket, 'message', 'success', {
			message: 'Settings saved!'
		});

		emitSocketToUser(socket, 'admin', 'settings_apply', { settings });

		emitSocketToUser(socket, 'site', 'refresh');

		cooldown(false, false);
	});
}

/* ----- CLIENT USAGE ----- */
function getUsers(user, socket, page, order, search, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	var order_allowed = [ 0, 1, 2, 3, 4, 5 ];
	if(!order_allowed.includes(order)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid order!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

	pool.query('SELECT `userid` FROM `users_logins` WHERE `ip` = ' + pool.escape(search) + ' GROUP BY `userid`', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting users (1)'
            });

			return cooldown(false, true);
		}

		var userids = row1.map(a => '"' + a.userid + '"').join(',') || 'null';

		pool.query('SELECT COUNT(*) AS `count` FROM `users` WHERE `bot` = 0 AND (`userid` LIKE ' + pool.escape('%' + search + '%') + ' OR `name` LIKE ' + pool.escape('%' + search + '%') + ' OR `userid` IN (' + userids + '))', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting users (2)'
                });

				return cooldown(false, true);
			}

			var pages = Math.ceil(row2[0].count / 10);

			if(pages <= 0){
				emitSocketToUser(socket, 'pagination', 'admin_users', {
					list: [],
					pages: 1,
					page: 1
				});

				return cooldown(false, false);
			}

			if(page <= 0 || page > pages) {
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid page!'
				});

				return cooldown(false, true);
			}

			var order_query = {
				0: 'ORDER BY `time_create` ASC',
				1: 'ORDER BY `name` ASC',
				2: 'ORDER BY `name` DESC',
				3: 'ORDER BY `balance` ASC',
				4: 'ORDER BY `balance` DESC',
				5: 'ORDER BY `rank` DESC'
			}[order];

			pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance`, `rank`, `time_create` FROM `users` WHERE `bot` = 0 AND (`userid` LIKE ' + pool.escape('%' + search + '%') + ' OR `name` LIKE ' + pool.escape('%' + search + '%') + ' OR `userid` IN (' + userids + ')) ' + order_query + ' LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err3, row3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while getting users (3)'
                    });

					return cooldown(false, true);
				}

				var list = row3.map(a => ({
					user: {
						userid: a.userid,
						name: a.name,
						avatar: a.avatar,
						level: calculateLevel(a.xp).level
					},
					balance: getFormatAmount(a.balance),
					rank: a.rank,
					time_create: makeDate(new Date(a.time_create * 1000))
				}));

				emitSocketToUser(socket, 'pagination', 'admin_users', {
					list: list,
					pages: pages,
					page: page
				});

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function removeUserBind(user, socket, userid, bind, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

    if(config.settings.server.binds[bind] === undefined || !config.settings.server.binds[bind]) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid bind!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while removing user bind (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users_binds` WHERE `userid` = ' + pool.escape(userid) + ' AND `bind` = ' + pool.escape(bind) + ' AND `removed` = 0', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while removing user bind (2)'
                });

				return cooldown(false, true);
			}

			if(row2.length <= 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'User not binded with ' + bind + '!'
				});

				return cooldown(false, true);
			}

			pool.query('UPDATE `users_binds` SET `removed` = 1 WHERE `userid` = ' + pool.escape(userid) + ' AND `bind` = ' + pool.escape(bind), function(err3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while removing user bind (3)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Bind removed!'
				});

				emitSocketToUser(socket, 'site', 'refresh');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function removeUserExclusion(user, socket, userid, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while removing user exclusion (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		if(row1[0].exclusion <= time()){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'User have no exclusion!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `users` SET `exclusion` = 0 WHERE `userid` = ' + pool.escape(userid), function(err2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while removing user exclusion (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Exclusion removed!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function removeUserSessions(user, socket, userid, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while removing user sessions (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users_sessions` WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while removing user sessions (2)'
                });

				return cooldown(false, true);
			}

			if(row2.length <= 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'User have no active sessions!'
				});

				return cooldown(false, true);
			}

			pool.query('UPDATE `users_sessions` SET `removed` = 1 WHERE `userid` = ' + pool.escape(userid) + ' AND `removed` = 0 AND `expire` > ' + pool.escape(time()), function(err3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while removing user sessions (3)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Sessions successfully removed. User has been disconnected!'
				});

				emitSocketToUser(socket, 'site', 'refresh');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function banUserIp(user, socket, userid, ip, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while banning user ip (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users_logins` WHERE `userid` = ' + pool.escape(userid) + ' AND `ip` = ' + pool.escape(ip), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while banning user ip (2)'
                });

				return cooldown(false, true);
			}

			if(row2.length <= 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Unknown ip!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `bannedip` WHERE `ip` = ' + pool.escape(ip) + ' AND `removed` = 0', function(err3, row3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while banning user ip (3)'
                    });

					return cooldown(false, true);
				}

				if(row3.length > 0){
					emitSocketToUser(socket, 'message', 'error', {
						message: 'Ip already banned!'
					});

					return cooldown(false, true);
				}

				pool.query('INSERT INTO `bannedip` SET `ip` = ' + pool.escape(ip) + ', `userid` = ' + pool.escape(user.userid) + ', `time` = ' + pool.escape(time()), function(err4){
					if(err4){
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while banning user ip (4)'
                        });

						return cooldown(false, true);
					}

					emitSocketToUser(socket, 'message', 'success', {
						message: 'IP banned successfully!'
					});

					emitSocketToUser(socket, 'site', 'refresh');

					cooldown(false, false);
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function unbanUserIp(user, socket, userid, ip, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while unbanning user ip (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users_logins` WHERE `userid` = ' + pool.escape(userid) + ' AND `ip` = ' + pool.escape(ip), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while unbanning user ip (2)'
                });

				return cooldown(false, true);
			}

			if(row2.length <= 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Unknown user ip!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `bannedip` WHERE `ip` = ' + pool.escape(ip) + ' AND `removed` = 0', function(err3, row3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while unbanning user ip (3)'
                    });

					return cooldown(false, true);
				}

				if(row3.length <= 0){
					emitSocketToUser(socket, 'message', 'error', {
						message: 'Ip not banned!'
					});

					return cooldown(false, true);
				}

				pool.query('UPDATE `bannedip` SET `removed` = 1 WHERE `ip` = ' + pool.escape(ip) + ' AND `removed` = 0', function(err4){
					if(err4){
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while unbanning user ip (4)'
                        });

						return cooldown(false, true);
					}

					emitSocketToUser(socket, 'message', 'success', {
						message: 'IP unbanned successfully!'
					});

					emitSocketToUser(socket, 'site', 'refresh');

					cooldown(false, false);
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function setUserRank(user, socket, userid, rank, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	var allowed_ranks = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 100 ];
	if(!allowed_ranks.includes(rank)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid rank!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while setting user rank (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		if(row1[0].rank == rank){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'User have already this rank!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `users` SET `rank` = ' + pool.escape(rank) + ' WHERE `userid` = ' + pool.escape(userid), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while setting user rank (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Rank setted!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function editUserBalance(user, socket, userid, amount, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	verifyFormatAmount(amount, function(err1, amount){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while editing user balance (1)'
                });

				return cooldown(false, true);
			}

			if(row2.length <= 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Unknown user!'
				});

				return cooldown(false, true);
			}

			if(getFormatAmount(row2[0].balance) + amount < 0) amount = -getFormatAmount(row2[0].balance);

			//EDIT BALANCE
			userService.editBalance(userid, amount, 'change_balance', function(err3, newbalance){
				if(err3) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: err3.message
                    });

					return cooldown(false, true);
				}

				emitSocketToRoom(userid, 'message', 'info', {
					message: 'You got ' + getFormatAmountString(amount) + ' coins from ' + user.name + '!'
				});

				emitSocketToUser(socket, 'message', 'info', {
					message: 'You gave ' + getFormatAmountString(amount) + ' coins to ' + row2[0].name + '.'
				});

				userService.updateBalance(userid, 'main', newbalance);

				emitSocketToUser(socket, 'site', 'refresh');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function setUserRestriction(user, socket, userid, restriction, time, reason, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	userService.setRestrictionAccount(user, socket, {
		userid: userid,
		restriction: restriction,
		time: time,
		reason: reason
	}, true, function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		emitSocketToUser(socket, 'message', 'success', {
			message: 'The user was successfully restricted!'
		});

		emitSocketToUser(socket, 'site', 'refresh');

		cooldown(false, false);
	});
}

/* ----- CLIENT USAGE ----- */
function unsetUserRestriction(user, socket, userid, restriction, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	userService.unsetRestrictionAccount(user, socket, {
		userid: userid,
		restriction: restriction
	}, function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		emitSocketToUser(socket, 'message', 'success', {
			message: 'The user was successfully unrestricted!'
		});

		emitSocketToUser(socket, 'site', 'refresh');

		cooldown(false, false);
	});
}

/* ----- CLIENT USAGE ----- */
function setAdminAccess(user, socket, userid, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while setting admin access (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		var admin_allowed = [ ...config.settings.allowed.admin ];

		if(admin_allowed.includes(userid)) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Userid already in list!'
			});

			return cooldown(false, true);
		}

		admin_allowed.push(userid);

		saveSetting('allowed..admin', admin_allowed, function(err2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Settings saved!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function unsetAdminAccess(user, socket, userid, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(userid), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while unsetting admin access (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user!'
			});

			return cooldown(false, true);
		}

		var admin_allowed = [ ...config.settings.allowed.admin ];

		if(!admin_allowed.includes(userid)) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Userid not in list!'
			});

			return cooldown(false, true);
		}

		var index = admin_allowed.indexOf(userid);
		admin_allowed.splice(index, 1);

		saveSetting('allowed..admin', admin_allowed, function(err2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: err2.message
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Settings saved!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createTrackingLink(user, socket, expire, usage, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	usage = usage.trim();

	if(usage.length < config.app.admin.tracking_links.usage_length.min){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a usage with minimum ' + config.app.admin.tracking_links.usage_length.min + ' characters!'
		});

		return cooldown(false, true);
	}

	if(usage.length > config.app.admin.tracking_links.usage_length.max){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a usage with maximum ' + config.app.admin.tracking_links.usage_length.max + ' characters!'
		});

		return cooldown(false, true);
	}

	var expire_value = getTimeString(expire);
	var referral = generateHexCode(config.app.admin.tracking_links.code_length);

	pool.query('INSERT INTO `tracking_links` SET `userid` = ' + pool.escape(user.userid) + ', `referral` = ' + pool.escape(referral) + ', `usage` = ' + pool.escape(usage) + ', `expire` = ' + pool.escape(expire_value) + ', `time` = ' + pool.escape(time()), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while creating tracking link (1)'
            });

			return cooldown(false, true);
		}

		emitSocketToUser(socket, 'message', 'success', {
			message: 'Referral link created successfully!'
		});

		emitSocketToUser(socket, 'site', 'refresh');

		cooldown(false, false);
	});
}

/* ----- CLIENT USAGE ----- */
function removeTrackingLink(user, socket, id, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `tracking_links` WHERE `id` = ' + pool.escape(id) + ' AND `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1)', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while removing tracking link (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown referral!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `tracking_links` SET `removed` = 1 WHERE `id` = ' + pool.escape(id) + ' AND `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1)', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while removing tracking link (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Referral link removed successfully!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createDepositBonus(user, socket, referral, code, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	code = code.trim().toLowerCase();

	if(code.length < config.app.admin.deposit_bonuses.code_length.min){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a code with minimum ' + config.app.admin.deposit_bonuses.code_length.min + ' characters!'
		});

		return cooldown(false, true);
	}

	if(code.length > config.app.admin.deposit_bonuses.code_length.max){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a code with maximum ' + config.app.admin.deposit_bonuses.code_length.max + ' characters!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `users` WHERE `userid` = ' + pool.escape(referral), function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while creating deposit bonus (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown user referral!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `deposit_codes` WHERE `code` = ' + pool.escape(code) + ' AND `removed` = 0', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while creating deposit bonus (2)'
                });

				return cooldown(false, true);
			}

			if(row2.length > 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Deposit bonus code already used!'
				});

				return cooldown(false, true);
			}

			pool.query('INSERT INTO `deposit_codes` SET `userid` = ' + pool.escape(user.userid) + ', `referral` = ' + pool.escape(row1[0].userid) + ', `code` = ' + pool.escape(code) + ', `time` = ' + pool.escape(time()), function(err3, row3){
				if(err3){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while creating deposit bonus (3)'
                    });

					return cooldown(false, true);
				}

				emitSocketToUser(socket, 'message', 'success', {
					message: 'Deposit bonus code created successfully!'
				});

				emitSocketToUser(socket, 'site', 'refresh');

				cooldown(false, false);
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function removeDepositBonus(user, socket, id, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT * FROM `deposit_codes` WHERE `id` = ' + pool.escape(id) + ' AND `removed` = 0', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while removing deposit bonus (1)'
            });

			return cooldown(false, true);
		}

		if(row1.length <= 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Unknown deposit bonus code!'
			});

			return cooldown(false, true);
		}

		pool.query('UPDATE `deposit_codes` SET `removed` = 1 WHERE `id` = ' + pool.escape(id) + ' AND `removed` = 0', function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while removing deposit bonus (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Deposit bonus code removed successfully!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

function setGamesHouseEdges(user, socket, house_edges, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

    // Why:
    // - Keep this endpoint resilient to future UI changes.
    // - Prevent malformed client requests from throwing.
    if(!Array.isArray(house_edges)) {
        emitSocketToUser(socket, 'message', 'error', { message: 'Invalid house edges payload!' });
        return cooldown(false, true);
    }

    for(var i = 0; i < house_edges.length; i++){
        if(!Object.keys(config.settings.games.games.original).includes(house_edges[i].game)){
            emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid game!'
			});

			return cooldown(false, true);
        }

        if(house_edges[i].value < 0 || house_edges[i].value > 100){
            emitSocketToUser(socket, 'message', 'error', {
				message: 'The amount must have a percentage!'
			});

			return cooldown(false, true);
        }

        if(config.settings.games.games.original[house_edges[i].game].house_edge.fixed && parseFloat(house_edges[i].value) != config.settings.games.games.original[house_edges[i].game].house_edge.value){
            emitSocketToUser(socket, 'message', 'error', {
				message: 'The ' + house_edges[i].game + ' game have a fixed house edge and cannot be modified!'
			});

			return cooldown(false, true);
        }
    }

    iterate(0, function(err1){
        if(err1){
            emitSocketToUser(socket, 'message', 'error', {
                message: err1.message
            });

            return cooldown(false, true);
        }

        emitSocketToUser(socket, 'message', 'success', {
            message: 'House edges saved!'
        });

        emitSocketToUser(socket, 'site', 'refresh');

        cooldown(false, false);
    })

    function iterate(index, callback){
        if(index >= house_edges.length) return callback(null);

        if(parseFloat(house_edges[index].value) == config.settings.games.games.original[house_edges[index].game].house_edge.value) return iterate(index + 1, callback);

        saveSetting('games..games..original..' + house_edges[index].game + '..house_edge..value', parseFloat(house_edges[index].value), function(err1){
            if(err1) return callback(err1);

            iterate(index + 1, callback);
		});
    }
}

/* ----- CLIENT USAGE ----- */
function confirmWithdrawListing(user, socket, method, trade, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	var allowed_method = [
        'crypto'
    ];

	if(!allowed_method.includes(method)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid method!'
		});

		return cooldown(false, true);
	}

    if(method == 'crypto') {
		cryptoService.confirmWithdrawListing(user, trade, function(err1, transactionid){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', {
					message: err1.message
				});

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'info', {
				message: 'Crypto withdraw order was confirmed successfully!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	}
}

/* ----- CLIENT USAGE ----- */
function cancelWithdrawListing(user, socket, method, trade, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	var allowed_method = [
        'crypto'
    ];

	if(!allowed_method.includes(method)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid method!'
		});

		return cooldown(false, true);
	}

    if(method == 'crypto') {
		cryptoService.cancelWithdrawListing(user, trade, function(err1){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', {
					message: err1.message
				});

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'info', {
				message: 'Crypto withdraw order was canceled successfully!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	}
}

/* ----- CLIENT USAGE ----- */
function setManuallyWithdrawAmount(user, socket, amount, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	verifyFormatAmount(amount, function(err1, amount){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
				message: err1.message
			});

			return cooldown(false, true);
		}

		if(amount < 0){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'The amount must have a greater value!'
			});

			return cooldown(false, true);
		}

		saveSetting('payments..manually..amount', getFormatAmount(amount), function(err1){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', {
                    message: err1.message
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: 'Amount saved!'
			});

			emitSocketToUser(socket, 'site', 'refresh');

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function getCryptoWithdrawListings(user, socket, page, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);

	pool.query('SELECT COUNT(*) AS `count` FROM `crypto_listings` WHERE `confirmed` = 0 AND `canceled` = 0', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting crypto withdraw listings (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'admin_crypto_confirmations', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT `id`, `userid`, `amount`, `currency`, `time` FROM `crypto_listings` WHERE `confirmed` = 0 AND `canceled` = 0 ORDER BY `id` ASC LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting crypto withdraw listings (2)'
                });

				return cooldown(false, true);
			}

			var list = row2.map(a => ({
				id: a.id,
				userid: a.userid,
				amount: getFormatAmount(a.amount),
				currency: a.currency,
				time: makeDate(new Date(a.time * 1000))
			}));

			emitSocketToUser(socket, 'pagination', 'admin_crypto_confirmations', {
				list: list,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function getTrackingLinks(user, socket, page, search, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

	pool.query('SELECT COUNT(*) AS `count` FROM `tracking_links` WHERE `referral` LIKE ' + pool.escape('%' + search + '%') + ' AND `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1)', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting tracking link (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'admin_tracking_links', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT `id`, `userid`, `referral`, `usage` FROM `tracking_links` WHERE `referral` LIKE ' + pool.escape('%' + search + '%') + ' AND `removed` = 0 AND (`expire` > ' + pool.escape(time()) + ' OR `expire` = -1) ORDER BY `id` ASC LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting tracking link (2)'
                });

				return cooldown(false, true);
			}

			var list = row2.map(a => ({
				id: a.id,
				userid: a.userid,
				referral: a.referral,
				usage: a.usage,
				link: config.app.url + '?ref=' + a.referral
			}));

			emitSocketToUser(socket, 'pagination', 'admin_tracking_links', {
				list: list,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function getDepositBonuses(user, socket, page, search, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

	pool.query('SELECT COUNT(*) AS `count` FROM `deposit_codes` WHERE (`referral` LIKE ' + pool.escape('%' + search + '%') + ' OR `code` LIKE ' + pool.escape('%' + search.toLowerCase() + '%') + ') AND `removed` = 0', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting deposit bonuses (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'admin_deposit_bonuses', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT `id`, `referral`, `code`, `uses`, `amount` FROM `deposit_codes` WHERE (`referral` LIKE ' + pool.escape('%' + search + '%') + ' OR `code` LIKE ' + pool.escape('%' + search + '%') + ') AND `removed` = 0 ORDER BY `id` ASC LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting deposit bonuses (2)'
                });

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'pagination', 'admin_deposit_bonuses', {
				list: row2,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function confirmGameBot(user, socket, userid, game, data, cooldown){
	cooldown(true, true);

	var allowed_games = [
        'coinflip'
    ];

	if(!allowed_games.includes(game)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid game!'
		});

		return cooldown(false, true);
	}

	if(!config.settings.games.bots.enable[game] && !haveRankPermission('call_gamebots', user.rank)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Calling bots for this game are disabled. Please try again later!'
		});

		return cooldown(false, true);
	}

    if(game == 'coinflip'){
		continueGameBotCoinflip(userid, parseInt(data.id), function(err1, bot){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', {
					message: err1.message
				});

				return cooldown(false, true);
			}

			emitSocketToUser(socket, 'message', 'success', {
				message: bot.name + ' successfully called in your coinflip!'
			});

			cooldown(false, false);
		});
	}

}

/* ----- INTERNAL USAGE ----- */
function continueGameBotCoinflip(userid, id, callback){
	if(isNaN(Number(id))) return callback(new Error('Invalid game. Please join in a valid game!'));

	if(coinflipService.games[id] === undefined) return callback(new Error('Invalid game. Please join in a valid game!'));
	if(coinflipService.games[id]['status'] != 0) return callback(new Error('This game are already ended!'));

	if(Object.keys(coinflipService.secure[id]).length > 0) return callback(new Error('Another user are trying to join in this game. Please try again later!'));

	var amount = getFormatAmount(coinflipService.games[id]['amount']);

	pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance` FROM `users` WHERE `bot` = 1', function(err1, row1) {
		if(err1) return callback(new Error('An error occurred while continuing game bot coinflip (1)'));

		var bots = [];

		row1.forEach(function(item){
			var available = true;

			if(getFormatAmount(item.balance) < amount) available = false;
			if(coinflipService.games[id].players.filter(a => a.user.userid == item.userid).length > 0) available = false;

			if(available){
				bots.push({
					userid: item.userid,
					name: item.name,
					avatar: item.avatar,
					xp: item.xp,
					bot: 1
				});
			}
		});

		if(bots.length <= 0) return callback(new Error('No available bots to join coinflip!'));

		var bot = bots[getRandomInt(0, bots.length - 1)];

		coinflipService.secure[id][bot.userid] = true;

		coinflipService.confirmJoinGame(bot, id, function(err2){
			if(err2) return callback(err2);

			if(coinflipService.secure[id] !== undefined) if(coinflipService.secure[id][bot.userid] !== undefined) delete coinflipService.secure[id][bot.userid];

			callback(null, {
				userid: bot.userid,
				name: bot.name,
				avatar: bot.avatar,
				level: calculateLevel(bot.xp).level
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createGameBot(user, socket, name, secret, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	/* CHECK DATA */

	name = name.trim();

	if(name.length < config.app.admin.gamebots_requirements.name_length.min){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a name with minimum ' + config.app.admin.gamebots_requirements.name_length.min + ' characters!'
		});

		return cooldown(false, true);
	}

	if(name.length > config.app.admin.gamebots_requirements.name_length.max){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You need to put a name with maximum ' + config.app.admin.gamebots_requirements.name_length.max + ' characters!'
		});

		return cooldown(false, true);
	}

	var userid = uuid.uuidv4();

	name = 'Bot ' + name;

	var avatar = config.app.url + '/img/avatar.jpg';

	pool.query('INSERT INTO `users` SET `bot` = 1, `userid` = ' + pool.escape(userid) + ', `name` = ' + pool.escape(name) + ', `avatar` = ' + pool.escape(avatar) + ', `time_create` = ' + pool.escape(time()), function(err1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while creating game bot (1)'
            });

			return cooldown(false, true);
		}

        pool.query('INSERT INTO `users_changes` SET `userid` = ' + pool.escape(userid) + ', `change` = ' + pool.escape('name') + ', `value` = ' + pool.escape(name) + ', `time` = ' + pool.escape(time()), function(err3){
            if(err3){
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while creating game bot (2)'
                });

                return cooldown(false, true);
            }

            pool.query('INSERT INTO `users_changes` SET `userid` = ' + pool.escape(userid) + ', `change` = ' + pool.escape('avatar') + ', `value` = ' + pool.escape(avatar) + ', `time` = ' + pool.escape(time()), function(err4){
                if(err4){
                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while creating game bot (3)'
                    });

                    return cooldown(false, true);
                }

                var client_seed = generateHexCode(32);
                var server_seed = generateHexCode(64);

                pool.query('INSERT INTO `users_seeds_client` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(client_seed) + ', `time` = ' + pool.escape(time()), function(err5){
                    if(err5){
                        emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while creating game bot (4)'
                        });

                        return cooldown(false, true);
                    }

                    pool.query('INSERT INTO `users_seeds_server` SET `userid` = ' + pool.escape(userid) + ', `seed` = ' + pool.escape(server_seed) + ', `time` = ' + pool.escape(time()), function(err6){
                        if(err6){
                            emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while creating game bot (5)'
                            });

                            return cooldown(false, true);
                        }

                        emitSocketToUser(socket, 'message', 'success', {
                            message: 'Game bot created successfully!'
                        });

                        emitSocketToUser(socket, 'site', 'refresh');

                        cooldown(false, false);
                    });
                });
            });
        });
	});
}

/* ----- CLIENT USAGE ----- */
function getGameBots(user, socket, page, order, search, cooldown){
	cooldown(true, true);

	if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	var order_allowed = [ 0, 1, 2, 3, 4 ];
	if(!order_allowed.includes(order)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid order!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

	pool.query('SELECT COUNT(*) AS `count` FROM `users` WHERE `bot` = 1 AND (`userid` LIKE ' + pool.escape('%' + search + '%') + ' OR `name` LIKE ' + pool.escape('%' + search + '%') + ')', function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting game bots (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'admin_gamebots', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		var order_query = {
			0: 'ORDER BY `time_create` ASC',
			1: 'ORDER BY `name` ASC',
			2: 'ORDER BY `name` DESC',
			3: 'ORDER BY `balance` ASC',
			4: 'ORDER BY `balance` DESC'
		}[order];

		pool.query('SELECT `userid`, `name`, `avatar`, `xp`, `balance`, `time_create` FROM `users` WHERE `bot` = 1 AND (`userid` LIKE ' + pool.escape('%' + search + '%') + ' OR `name` LIKE ' + pool.escape('%' + search + '%') + ') ' + order_query + ' LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting game bots (2)'
                });

				return cooldown(false, true);
			}

			var list = row2.map(a => ({
				user: {
					userid: a.userid,
					name: a.name,
					avatar: a.avatar,
					level: calculateLevel(a.xp).level
				},
				balance: getFormatAmount(a.balance),
				time_create: makeDate(new Date(a.time_create * 1000))
			}));

			emitSocketToUser(socket, 'pagination', 'admin_gamebots', {
				list: list,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

/* ----- CLIENT USAGE ----- */
function claimSupportRequest(user, socket, id, secret, cooldown){
	cooldown(true, true);

    if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT `id` FROM `support_requests` WHERE `requestid` = ' + pool.escape(id) + ' AND `status` = 0', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while claiming support request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        pool.query('INSERT `support_claims` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + pool.escape(user.xp) + ', `requestid` = ' + pool.escape(row1[0].id) + ', `time` = ' + pool.escape(time()), function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while claiming support request (2)'
                });

                return cooldown(false, true);
            }

            pool.query('UPDATE `support_requests` SET `status` = 1 WHERE `id` = ' + pool.escape(row1[0].id) + ' AND `status` = 0', function(err3, row3){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while claiming support request (3)'
                    });

                    return cooldown(false, true);
                }

                emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_claim', {
                    closed: 0,
                    status: 1
                });

                emitSocketToUser(socket, 'message', 'success', {
                    message: 'You successfully claimed this support request!'
                });

                cooldown(false, false);
            });
        });
    });
}

/* ----- CLIENT USAGE ----- */
function releaseSupportRequest(user, socket, id, secret, cooldown){
	cooldown(true, true);

    if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

	pool.query('SELECT support_requests.id FROM `support_requests` INNER JOIN `support_claims` ON support_requests.id = support_claims.requestid WHERE support_requests.requestid = ' + pool.escape(id) + ' AND (support_requests.status = 1 OR support_requests.status = 2) AND support_claims.ended = 0', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while releasing support request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        pool.query('UPDATE `support_claims` SET `ended` = 1 WHERE `requestid` = ' + pool.escape(row1[0].id) + ' AND `ended` = 0', function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while releasing support request (2)'
                });

                return cooldown(false, true);
            }

            pool.query('UPDATE `support_requests` SET `status` = 0 WHERE `id` = ' + pool.escape(row1[0].id) + ' AND (`status` = 1 OR `status` = 2)', function(err3, row3){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while releasing support request (3)'
                    });

                    return cooldown(false, true);
                }

                emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_release', {
                    closed: 0,
                    status: 0
                });

                emitSocketToUser(socket, 'message', 'success', {
                    message: 'You successfully released this support request!'
                });

                cooldown(false, false);
            });
        });
    });
}

/* ----- CLIENT USAGE ----- */
function changeDepartmentSupportRequest(user, socket, id, department, secret, cooldown){
	cooldown(true, true);

    if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

    /* CHECK DATA */

    if(isNaN(Number(department))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid department!'
		});

		return cooldown(false, true);
	}

	department = parseInt(department);

	var allowed_departments = [ 0, 1, 2, 3, 4, 5 ];
	if(!allowed_departments.includes(department)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid department!'
		});

		return cooldown(false, true);
	}

    /* END CHECK DATA */

    pool.query('SELECT support_requests.id FROM `support_requests` INNER JOIN `support_claims` ON support_requests.id = support_claims.requestid WHERE support_requests.requestid = ' + pool.escape(id) + ' AND (support_requests.status = 1 OR support_requests.status = 2) AND support_claims.ended = 0', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while changing department support request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        var update = time();

        pool.query('UPDATE `support_requests` SET `department` = ' + pool.escape(department) + ', `update` = ' + pool.escape(update) + ' WHERE `id` = ' + pool.escape(row1[0].id) + ' AND (`status` = 1 OR `status` = 2)', function(err3, row3){
            if(err3) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while changing department support request (3)'
                });

                return cooldown(false, true);
            }

            emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_department', {
                department: department,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToRoom('support/requests/' + id, 'support', 'department', {
                department: department,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToUser(socket, 'message', 'success', {
                message: 'You successfully released this support request!'
            });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function replySupportRequest(user, socket, id, message, secret, cooldown){
	cooldown(true, true);

    if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

    /* CHECK DATA */

    message = message.trim();

    if(message.length < config.app.support.requirements.message_length.min || message.length > config.app.support.requirements.message_length.max){
        emitSocketToUser(socket, 'message', 'error', {
            message: 'Invalid message length [' + config.app.support.requirements.message_length.min + '-' + config.app.support.requirements.message_length.max + ']!'
        });

        return cooldown(false, true);
    }

    message= escapeHTML(message);

    /* END CHECK DATA */

    pool.query('SELECT support_requests.id, support_requests.name FROM `support_requests` INNER JOIN `support_claims` ON support_requests.id = support_claims.requestid WHERE support_requests.requestid = ' + pool.escape(id) + ' AND (support_requests.status = 1 OR support_requests.status = 2) AND support_claims.ended = 0', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while replying support request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        var update = time();

        pool.query('INSERT `support_messages` SET `userid` = ' + pool.escape(user.userid) + ', `name` = ' + pool.escape(user.name) + ', `avatar` = ' + pool.escape(user.avatar) + ', `xp` = ' + pool.escape(user.xp) + ', `message` = ' + pool.escape(message) + ', `requestid` = ' + pool.escape(row1[0].id) + ', `response` = 1, `time` = ' + pool.escape(update), function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while replying support request (2)'
                });

                return cooldown(false, true);
            }

            pool.query('UPDATE `support_requests` SET `status` = 2, `update` = ' + pool.escape(update) + ' WHERE `id` = ' + pool.escape(row1[0].id) + ' AND (`status` = 1 OR `status` = 2)', function(err3, row3){
                if(err3) {
                    emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while replying support request (3)'
                    });

                    return cooldown(false, true);
                }

                emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_reply', {
                    closed: 0,
                    status: 2,
                    user: {
                        userid: user.userid,
                        name: user.name,
                        avatar: user.avatar,
                        level: calculateLevel(user.xp).level
                    },
                    requester: row1[0].name,
                    response: 1,
                    message: message,
                    date: makeDate(new Date(update * 1000))
                });

                emitSocketToRoom('support/requests/' + id, 'support', 'reply', {
                    closed: 0,
                    status: 2,
                    user: {
                        userid: user.userid,
                        name: user.name,
                        avatar: user.avatar,
                        level: calculateLevel(user.xp).level
                    },
                    requester: row1[0].name,
                    response: 1,
                    message: message,
                    date: makeDate(new Date(update * 1000))
                });

                emitSocketToUser(socket, 'message', 'success', {
                    message: 'You successfully replied this support request!'
                });

                cooldown(false, false);
            });
        });
    });
}

/* ----- CLIENT USAGE ----- */
function closeSupportRequest(user, socket, id, secret, cooldown){
	cooldown(true, true);

    if(!config.settings.allowed.admin.includes(user.userid)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'You don\'t have permission to use that!'
		});

		return cooldown(false, true);
	}

	if(!config.app.access_secrets.includes(secret)) {
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid secret!'
		});

		return cooldown(false, true);
	}

    pool.query('SELECT support_requests.id FROM `support_requests` INNER JOIN `support_claims` ON support_requests.id = support_claims.requestid WHERE support_requests.requestid = ' + pool.escape(id) + ' AND (support_requests.status = 1 OR support_requests.status = 2) AND support_claims.ended = 0', function(err1, row1){
        if(err1) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while closing support request (1)'
            });

            return cooldown(false, true);
        }

        if(row1.length <= 0) {
            emitSocketToUser(socket, 'message', 'error', {
                message: 'Invalid support request or already closed!'
            });

            return cooldown(false, true);
        }

        var update = time();

        pool.query('UPDATE `support_requests` SET `closed` = 1, `update` = ' + pool.escape(update) + ' WHERE `id` = ' + pool.escape(row1[0].id) + ' AND (`status` = 1 OR `status` = 2)', function(err2, row2){
            if(err2) {
                emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while closing support request (2)'
                });

                return cooldown(false, true);
            }

            emitSocketToRoom('admin/support/requests/' + id, 'admin', 'support_close', {
                closed: 1,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToRoom('support/requests/' + id, 'admin', 'close', {
                closed: 1,
                date: makeDate(new Date(update * 1000))
            });

            emitSocketToUser(socket, 'message', 'success', {
                message: 'You successfully closed this support request!'
            });

            cooldown(false, false);
        });
    });
}

/* ----- CLIENT USAGE ----- */
function getSupportRequests(user, socket, page, status, department, search, cooldown){
    cooldown(true, true);

	var status_allowed = [ 0, 1, 2, 3, 4 ];
	if(!status_allowed.includes(status)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid status!'
		});

		return cooldown(false, true);
	}

    var department_allowed = [ 0, 1, 2, 3, 4, 5, 6 ];
	if(!department_allowed.includes(department)){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid department!'
		});

		return cooldown(false, true);
	}

	if(isNaN(Number(page))){
		emitSocketToUser(socket, 'message', 'error', {
			message: 'Invalid page!'
		});

		return cooldown(false, true);
	}

	page = parseInt(page);
	search = search.trim();

    var status_query = {
        0: 'AND support_requests.status IN (0, 1, 2)',
        1: 'AND support_requests.status = 0 AND support_requests.closed = 0',
        2: 'AND support_requests.status = 1 AND support_requests.closed = 0',
        3: 'AND support_requests.status = 2 AND support_requests.closed = 0',
        4: 'AND support_requests.closed = 1'
    }[status];

    var department_query = {
        0: 'AND support_requests.department IN (0, 1, 2, 3, 4, 5)',
        1: 'AND support_requests.department = 0',
        2: 'AND support_requests.department = 1',
        3: 'AND support_requests.department = 2',
        4: 'AND support_requests.department = 3',
        5: 'AND support_requests.department = 4',
        6: 'AND support_requests.department = 6'
    }[department];

	pool.query('SELECT COUNT(*) AS `count` FROM `support_requests` WHERE (`requestid` LIKE ' + pool.escape('%' + search + '%') + ' OR `subject` LIKE ' + pool.escape('%' + search + '%') + ') ' + status_query + ' ' + department_query, function(err1, row1){
		if(err1){
			emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting support requests (1)'
            });

			return cooldown(false, true);
		}

		var pages = Math.ceil(row1[0].count / 10);

		if(pages <= 0){
			emitSocketToUser(socket, 'pagination', 'admin_support_requests', {
				list: [],
				pages: 1,
				page: 1
			});

			return cooldown(false, false);
		}

		if(page <= 0 || page > pages) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid page!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT support_requests.subject, support_requests.department, support_requests.closed, support_requests.status, support_requests.requestid, support_requests.update, support_requests.time, support_claims.userid, support_claims.name, support_claims.avatar, support_claims.xp FROM `support_requests` LEFT JOIN `support_claims` ON support_requests.id = support_claims.requestid AND support_claims.ended = 0 WHERE (support_requests.requestid LIKE ' + pool.escape('%' + search + '%') + ' OR support_requests.subject LIKE ' + pool.escape('%' + search + '%') + ')' + ' ' + status_query + ' ' + department_query + ' ORDER BY support_requests.status ASC, support_requests.id DESC LIMIT 10 OFFSET ' + pool.escape(page * 10 - 10), function(err2, row2){
			if(err2){
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while getting support requests (2)'
                });

				return cooldown(false, true);
			}

			var list = row2.map(a => ({
				id: a.requestid,
                subject: a.subject,
                department: parseInt(a.department),
                closed: parseInt(a.closed),
                status: parseInt(a.status),
                assigned: parseInt(a.status) > 0 ? {
                    userid: a.userid,
                    name: a.name,
                    avatar: a.avatar,
                    level: calculateLevel(a.xp).level
                } : null,
                created: makeDate(new Date(a.time * 1000)),
                updated: makeDate(new Date(a.update * 1000))
			}));

			emitSocketToUser(socket, 'pagination', 'admin_support_requests', {
				list: list,
				pages: pages,
				page: page
			});

			cooldown(false, false);
		});
	});
}

module.exports = {
	updating,
	setMaintenance, setSettings,
	getUsers, removeUserBind, removeUserExclusion, removeUserSessions, banUserIp, unbanUserIp, setUserRank, editUserBalance, setUserRestriction, unsetUserRestriction, setAdminAccess, unsetAdminAccess,
	createTrackingLink, removeTrackingLink,
    createDepositBonus, removeDepositBonus,
    setGamesHouseEdges,
    confirmWithdrawListing, cancelWithdrawListing, setManuallyWithdrawAmount,
    getCryptoWithdrawListings,
    getTrackingLinks, getDepositBonuses,

    confirmGameBot, createGameBot, getGameBots,
    claimSupportRequest, releaseSupportRequest, changeDepartmentSupportRequest, replySupportRequest, closeSupportRequest, getSupportRequests
};