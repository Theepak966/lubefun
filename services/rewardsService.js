var { pool } = require('@/lib/database.js');
var { emitSocketToUser } = require('@/lib/socket.js');

var userService = require('@/services/userService.js');

var { getFormatAmount, getFormatAmountString, verifyFormatAmount } = require('@/utils/formatAmount.js');
var { time } = require('@/utils/formatDate.js');
var { haveRankPermission, verifyRecaptcha, calculateLevel } = require('@/utils/utils.js');

var config = require('@/config/config.js');

/* ----- CLIENT USAGE ----- */
function redeemDailyReward(user, socket, recaptcha, cooldown) {
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT SUM(amount) AS `amount` FROM `users_trades` WHERE `userid` = ' + pool.escape(user.userid) + ' AND `type` = ' + pool.escape("deposit") + ' AND `time` > ' + pool.escape(time() - config.app.rewards.daily.time), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while redeeming daily reward (1)'
                });

				return cooldown(false, true);
			}

			if(row1[0].amount < config.app.rewards.daily.amount) {
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You need to deposit at least ' + getFormatAmountString(config.app.rewards.daily.amount) + ' in the last ' + Math.floor(config.app.rewards.daily.time / (24 * 60 * 60)) + ' days.'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `users_rewards` WHERE `reward` = ' + pool.escape('daily') + ' AND `userid` = ' + pool.escape(user.userid) + ' ORDER BY `id` DESC LIMIT 1', function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while redeeming daily reward (2)'
                    });

					return cooldown(false, true);
				}

				if(row2.length > 0) {
					if(parseInt(row2[0].time) + 24 * 60 * 60 > time()){
						emitSocketToUser(socket, 'message', 'error', {
							message: 'You already collect this daily reward!'
						});

						return cooldown(false, true);
					}
				}

				var amount_got = getFormatAmount(calculateLevel(user.xp).level * config.app.rewards.amounts.daily_level + config.app.rewards.amounts.daily_start);

				pool.query('INSERT INTO `users_rewards` SET `userid` = ' + pool.escape(user.userid) + ', `reward` = ' + pool.escape('daily') + ', `amount` = ' + amount_got + ', `time` = ' + pool.escape(time()), function(err3){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while redeeming daily reward (3)'
                        });

						return cooldown(false, true);
					}

					//EDIT BALANCE
					userService.editBalance(user.userid, amount_got, 'daily_rewards', function(err4, newbalance){
						if(err4) {
							emitSocketToUser(socket, 'message', 'error', {
                                message: err4.message
                            });

							return cooldown(false, true);
						}

                        pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + amount_got + ' WHERE `userid` = ' + pool.escape(user.userid), function(err5){
                            if(err5) {
                                emitSocketToUser(socket, 'message', 'error', {
                                    message: 'An error occurred while redeeming daily reward (4)'
                                });

                                return cooldown(false, true);
                            }

                            getDailyCooldown(user, socket);

                            emitSocketToUser(socket, 'message', 'success', {
                                message: 'You claimed ' + getFormatAmountString(amount_got) + ' coins!'
                            });

                            userService.updateBalance(user.userid, 'main', newbalance);

                            cooldown(false, false);
					    });
					});
				});
			});
		});
	});
}

function getDailyCooldown(user, socket){
	pool.query('SELECT * FROM `users_rewards` WHERE `reward` = ' + pool.escape('daily') + ' AND `userid` = ' + pool.escape(user.userid) + ' ORDER BY `id` DESC LIMIT 1', function(err1, row1){
		if(err1) {
            return emitSocketToUser(socket, 'message', 'error', {
                message: 'An error occurred while getting daily cooldown (1)'
            });
        }

		if(row1.length == 0) {
			return emitSocketToUser(socket, 'rewards', 'timer', {
				time: 0
			});
		}

		if(parseInt(row1[0].time) + 24 * 60 * 60 <= time()){
			return emitSocketToUser(socket, 'rewards', 'timer', {
				time: 0
			});
		}

		emitSocketToUser(socket, 'rewards', 'timer', {
			time: parseInt(row1[0].time) + 24 * 60 * 60 - time()
		});
	});
}

/* ----- CLIENT USAGE ----- */
function redeemBindReward(user, socket, data, recaptcha, cooldown) {
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		if(config.settings.server.binds[data.bind] === undefined || !config.settings.server.binds[data.bind]) {
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid bind!'
			});

			return cooldown(false, true);
		}

		if(user.binds[data.bind] === undefined){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Your account is not binded!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `users_rewards` WHERE `reward` = ' + pool.escape(data.bind) + ' AND `userid` = ' + pool.escape(user.userid), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while redeeming bind reward (1)'
                });

				return cooldown(false, true);
			}

			if(row1.length > 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You already collect this reward!'
				});

				return cooldown(false, true);
			}

			var amount_got = getFormatAmount(config.app.rewards.amounts[data.bind]);

			pool.query('INSERT INTO `users_rewards` SET `userid` = ' + pool.escape(user.userid) + ', `reward` = ' + pool.escape(data.bind) + ', `amount` = ' + amount_got + ', `time` = ' + pool.escape(time()), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while redeeming bind reward (2)'
                    });

					return cooldown(false, true);
				}

				//EDIT BALANCE
				userService.editBalance(user.userid, amount_got, data.bind + '_rewards', function(err3, newbalance){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
                            message: err3.message
                        });

						return cooldown(false, true);
					}

                    pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + amount_got + ' WHERE `userid` = ' + pool.escape(user.userid), function(err4){
                        if(err4) {
                            emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while redeeming bind reward (3)'
                            });

                            return cooldown(false, true);
                        }

                        emitSocketToUser(socket, 'site', 'refresh');

                        emitSocketToUser(socket, 'message', 'success', {
                            message: 'You claimed ' + getFormatAmountString(amount_got) + ' coins!'
                        });

                        userService.updateBalance(user.userid, 'main', newbalance);

                        cooldown(false, false);
				    });
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function redeemRefferalCode(user, socket, data, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `referral_uses` WHERE `userid` = ' + pool.escape(user.userid), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while redeeming referral code (1)'
                });

				return cooldown(false, true);
			}

			if(row1.length > 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You already collect this reward!'
				});

				return cooldown(false, true);
			}

			var code = data.code.trim().toLowerCase();

			if(!(/(^[a-zA-Z0-9]*$)/.exec(code))){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid code. Please put valid characters!'
				});

				return cooldown(false, true);
			}

			if(code.length < config.app.rewards.requirements.code_length.min){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You need to put a code with minimum ' + config.app.rewards.requirements.code_length.min + ' characters!'
				});

				return cooldown(false, true);
			}

			if(code.length > config.app.rewards.requirements.code_length.max){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You need to put a code with maximum ' + config.app.rewards.requirements.code_length.max + ' characters!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `referral_codes` WHERE `code` = ' + pool.escape(code), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while redeeming referral code (2)'
                    });

					return cooldown(false, true);
				}

				if(row2.length == 0){
					emitSocketToUser(socket, 'message', 'error', {
						message: 'Code not found!'
					});

					return cooldown(false, true);
				}

				if(row2[0].userid == user.userid){
					emitSocketToUser(socket, 'message', 'error', {
						message: 'This is you referral code!'
					});

					return cooldown(false, true);
				}

				var amount_got = getFormatAmount(config.app.rewards.amounts.refferal_code);

				pool.query('INSERT INTO `referral_uses` SET `userid` = ' + pool.escape(user.userid) + ', `referral` = ' + pool.escape(row2[0].userid) + ', `amount` = ' + amount_got + ', `time` = ' + pool.escape(time()), function(err3, row3){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while redeeming referral code (3)'
                        });

						return cooldown(false, true);
					}

					pool.query('INSERT INTO `users_rewards` SET `userid` = ' + pool.escape(user.userid) + ', `reward` = ' + pool.escape('referral') + ', `amount` = ' + amount_got + ', `time` = ' + pool.escape(time()), function(err4){
						if(err4) {
							emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while redeeming referral code (4)'
                            });

							return cooldown(false, true);
						}

						//EDIT BALANCE
						userService.editBalance(user.userid, amount_got, 'code_rewards', function(err5, newbalance){
							if(err5) {
								emitSocketToUser(socket, 'message', 'error', {
                                    message: err5.message
                                });

								return cooldown(false, true);
							}

                            pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + amount_got + ' WHERE `userid` = ' + pool.escape(user.userid), function(err6){
                                if(err6) {
                                    emitSocketToUser(socket, 'message', 'error', {
                                        message: 'An error occurred while redeeming referral code (5)'
                                    });

                                    return cooldown(false, true);
                                }

                                emitSocketToUser(socket, 'site', 'refresh');

                                emitSocketToUser(socket, 'message', 'success', {
                                    message: 'You claimed ' + getFormatAmountString(amount_got) + ' coins!'
                                });

                                userService.updateBalance(user.userid, 'main', newbalance);

                                cooldown(false, false);
						    });
						});
					});
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createRefferalCode(user, socket, data, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		var code = data.code.trim().toLowerCase();

		if(!(/(^[a-zA-Z0-9]*$)/.exec(code))){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid code. Please put valid characters!'
			});

			return cooldown(false, true);
		}

		if(code.length < config.app.rewards.requirements.code_length.min){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You need to put a code with minimum ' + config.app.rewards.requirements.code_length.min + ' characters!'
			});

			return cooldown(false, true);
		}

		if(code.length > config.app.rewards.requirements.code_length.max){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You need to put a code with maximum ' + config.app.rewards.requirements.code_length.max + ' characters!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `referral_codes` WHERE `code` = ' + pool.escape(code), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while creating referral code (1)'
                });

				return cooldown(false, true);
			}

			if(row1.length > 0){
				emitSocketToUser(socket, 'message', 'error', {
				message: 'This code is already used!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `referral_codes` WHERE `userid` = ' + pool.escape(user.userid), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while creating referral code (2)'
                    });

					return cooldown(false, true);
				}

				if(row2.length > 0) {
					pool.query('UPDATE `referral_codes` SET `code` = ' + pool.escape(code) + ' WHERE `userid` = ' + pool.escape(user.userid), function(err3) {
						if(err3) {
							emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while creating referral code (3)'
                            });

							return cooldown(false, true);
						}

						pool.query('INSERT INTO `referral_updates` SET `userid` = ' + pool.escape(user.userid) + ', `code` = ' + pool.escape(code) + ', `time` = ' + pool.escape(time()), function(err4) {
							if(err4) {
								emitSocketToUser(socket, 'message', 'error', {
                                    message: 'An error occurred while creating referral code (4)'
                                });

								return cooldown(false, true);
							}

							emitSocketToUser(socket, 'site', 'refresh');

							emitSocketToUser(socket, 'message', 'success', {
								message: 'Code updated!'
							});

							cooldown(false, false);
						});
					});
				} else if(row2.length <= 0) {
					pool.query('INSERT INTO `referral_codes` SET `userid` = ' + pool.escape(user.userid) + ', `code` = ' + pool.escape(code) + ', `time` = ' + pool.escape(time()), function(err3) {
						if(err3) {
							emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while creating referral code (5)'
                            });

							return cooldown(false, true);
						}

						pool.query('INSERT INTO `referral_updates` SET `userid` = ' + pool.escape(user.userid) + ', `code` = ' + pool.escape(code) + ', `time` = ' + pool.escape(time()), function(err4) {
							if(err4) {
								emitSocketToUser(socket, 'message', 'error', {
                                    message: 'An error occurred while creating referral code (5)'
                                });

								return cooldown(false, true);
							}

							emitSocketToUser(socket, 'site', 'refresh');

							emitSocketToUser(socket, 'message', 'success', {
								message: 'Code created!'
							});

							cooldown(false, false);
						});
					});
				}
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function redeemBonusCode(user, socket, data, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		var code = data.code;

		if(!(/(^[a-zA-Z0-9]*$)/.exec(code))){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid code. Please put valid characters!'
			});

			return cooldown(false, true);
		}

		if(code.length < config.app.rewards.requirements.code_length.min){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You need to put a code with minimum ' + config.app.rewards.requirements.code_length.min + ' characters!'
			});

			return cooldown(false, true);
		}

		if(code.length > config.app.rewards.requirements.code_length.max){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You need to put a code with maximum ' + config.app.rewards.requirements.code_length.max + ' characters!'
			});

			return cooldown(false, true);
		}

		pool.query('SELECT * FROM `bonus_codes` WHERE `code` = ' + pool.escape(code), function(err1, row1){
			if(err1) {
				emitSocketToUser(socket, 'message', 'error', {
                    message: 'An error occurred while redeeming bonus code (1)'
                });

				return cooldown(false, true);
			}

			if(row1.length == 0){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Code not found!'
				});

				return cooldown(false, true);
			}

			if(row1[0].uses >= row1[0].max_uses){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'The code already did reach the maximum uses!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `bonus_uses` WHERE `code` = ' + pool.escape(code) + ' AND `userid` = ' + pool.escape(user.userid), function(err2, row2){
				if(err2) {
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while redeeming bonus code (2)'
                    });

					return cooldown(false, true);
				}

				if(row2.length > 0) {
					emitSocketToUser(socket, 'message', 'error', {
						message: 'You already claimed the bonus code!'
					});

					return cooldown(false, true);
				}

				var amount_got = getFormatAmount(row1[0].amount);

				pool.query('UPDATE `bonus_codes` SET `uses` = `uses` + 1 WHERE `code` = ' + pool.escape(code), function(err3){
					if(err3) {
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while redeeming bonus code (3)'
                        });

						return cooldown(false, true);
					}

					pool.query('INSERT INTO `bonus_uses` SET `userid` = ' + pool.escape(user.userid) + ', `code` = ' + pool.escape(code) + ', `amount` = ' + amount_got + ', `time` = ' + pool.escape(time()), function(err4){
						if(err4) {
							emitSocketToUser(socket, 'message', 'error', {
                                message: 'An error occurred while redeeming bonus code (4)'
                            });

							return cooldown(false, true);
						}

						//EDIT BALANCE
						userService.editBalance(user.userid, amount_got, 'bonus_rewards', function(err5, newbalance){
							if(err5) {
								emitSocketToUser(socket, 'message', 'error', {
                                    message: err5.message
                                });

								return cooldown(false, true);
							}

                            pool.query('UPDATE `users` SET `rollover` = `rollover` + ' + amount_got + ' WHERE `userid` = ' + pool.escape(user.userid), function(err6){
                                if(err6) {
                                    emitSocketToUser(socket, 'message', 'error', {
                                        message: 'An error occurred while redeeming bonus code (5)'
                                    });

                                    return cooldown(false, true);
                                }

                                emitSocketToUser(socket, 'message', 'success', {
                                    message: 'You claimed ' + getFormatAmountString(amount_got) + ' coins!'
                                });

                                userService.updateBalance(user.userid, 'main', newbalance);

                                cooldown(false, false);
						    });
						});
					});
				});
			});
		});
	});
}

/* ----- CLIENT USAGE ----- */
function createBonusCode(user, socket, data, recaptcha, cooldown){
	cooldown(true, true);

	verifyRecaptcha(recaptcha, function(verified){
		if(!verified){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'Invalid recaptcha!'
			});

			return cooldown(false, true);
		}

		if(!haveRankPermission('create_bonus', user.rank)){
			emitSocketToUser(socket, 'message', 'error', {
				message: 'You don\'t have permission to use that!'
			});

			return cooldown(false, true);
		}

		verifyFormatAmount(data.amount, function(err1, amount){
			if(err1){
				emitSocketToUser(socket, 'message', 'error', {
					message: err1.message
				});

				return cooldown(false, true);
			}

			if(amount < config.app.rewards.requirements.bonus_amount.min || amount > config.app.rewards.requirements.bonus_amount.max){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid amount [' + getFormatAmountString(config.app.rewards.requirements.bonus_amount.min) + ' - ' + getFormatAmountString(config.app.rewards.requirements.bonus_amount.max) + ']!'
				});

				return cooldown(false, true);
			}

			if(isNaN(Number(data.uses))){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid maximum uses!'
				});

				return cooldown(false, true);
			}

			var uses = parseInt(data.uses);

			if(uses < config.app.rewards.requirements.bonus_uses.min || uses > config.app.rewards.requirements.bonus_uses.max){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid maximum uses [' + config.app.rewards.requirements.bonus_uses.min + ' - ' + config.app.rewards.requirements.bonus_uses.max + ']!'
				});

				return cooldown(false, true);
			}

			var code = data.code.trim();

			if(!(/(^[a-zA-Z0-9]*$)/.exec(code))){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'Invalid code. Please put valid characters!'
				});

				return cooldown(false, true);
			}

			if(code.length < config.app.rewards.requirements.code_length.min){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You need to put a code with minimum ' + config.app.rewards.requirements.code_length.min + ' characters!'
				});

				return cooldown(false, true);
			}

			if(code.length > config.app.rewards.requirements.code_length.max){
				emitSocketToUser(socket, 'message', 'error', {
					message: 'You need to put a code with maximum ' + config.app.rewards.requirements.code_length.max + ' characters!'
				});

				return cooldown(false, true);
			}

			pool.query('SELECT * FROM `bonus_codes` WHERE `code` = ' + pool.escape(code), function(err2, row2){
				if(err2){
					emitSocketToUser(socket, 'message', 'error', {
                        message: 'An error occurred while creating bonus code (1)'
                    });

					return cooldown(false, true);
				}

				if(row2.length > 0){
					emitSocketToUser(socket, 'message', 'error', {
						message: 'This code is already used!'
					});

					return cooldown(false, true);
				}

				pool.query('INSERT INTO `bonus_codes` SET `userid` = ' + pool.escape(user.userid) + ', `code` = ' + pool.escape(code) + ', `amount` = ' + amount + ', `max_uses` = ' + uses + ', `time` = ' + pool.escape(time()), function(err3){
					if(err3){
						emitSocketToUser(socket, 'message', 'error', {
                            message: 'An error occurred while creating bonus code (2)'
                        });

						return cooldown(false, true);
					}

					emitSocketToUser(socket, 'message', 'success', {
						message: 'Code created!'
					});

					cooldown(false, false);
				});
			});
		});
	});
}

module.exports = {
	getDailyCooldown,
	redeemDailyReward, redeemBindReward, redeemRefferalCode, createRefferalCode, redeemBonusCode, createBonusCode
};