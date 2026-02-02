/*
           ______________________________________
  ________|                                      |_______
  \       |        Developed by MrCHICK          |      /
   \      |            VGOWitch.com              |     /
   /      |______________________________________|     \
  /__________)                                (_________\

*/

"use strict";

var INITIALIZED = false;

var USERID = null;
var SOCKET = null;

var RECAPTCHA = null;

var BALANCES = {
	'main': 0
};

var games_intervalAmounts = {};
var games_houseEdges = {};

//AUDIO
var audio_volume = 0.75;

var audio_names = {
	error: [ 'error' ],
	play: [ 'play' ],
	cashout: [ 'cashout' ],
	select: [ 'select' ],
    crash_stop: [ 'crash_stop' ],
    coinflip_start: [ 'coinflip_start' ],
	coinflip_stop: [ 'coinflip_stop' ],
    tower_win: [ 'tower_win' ],
	tower_loss: [ 'tower_loss' ],
    minesweeper_win: [ 'minesweeper_win' ],
	minesweeper_loss: [ 'minesweeper_loss' ]
};

var audio_sounds = {};

//PROFILE SETTINGS

var profile_settings = {
	'sounds': {
		'type': 'cookie',
		'value': '1'
	},
	'channel': {
		'type': 'cookie',
		'value': 'en'
	},
	'chat': {
		'type': 'cookie',
		'value': '0'
	},
	'anonymous': {
		'type': 'save',
		'value': '0'
	},
	'private': {
		'type': 'save',
		'value': '0'
	},
	'balance': {
		'type': 'cookie',
		'value': 'main'
	},
	'history': {
		'type': 'cookie',
		'value': 'all_bets'
	}
};

function sounds_initialize(){
	Object.keys(audio_names).forEach(function(item){
		audio_sounds[item] = [];

		audio_names[item].forEach(function(name){
			var sound = new Audio('/audio/' + name + '.wav');
			sound.load();

			audio_sounds[item].push(sound);
		})
	});
}

function sounds_play(name){
	var sounds = audio_sounds[name];

	var sound = sounds[getRandomInt(0, sounds.length - 1)].cloneNode();
	sound.volume = audio_volume;

	var play_promise = sound.play();

	if (play_promise !== undefined) {
		play_promise.then(function(){
			setTimeout(function(){
				sound = null;
			}, sound.duration * 1000);
		}).catch(function(err){
			sound.pause();
		});
	}
}

function profile_settingsChange(setting, value){
	if(profile_settings[setting] === undefined) return;

	profile_settings[setting].value = value;

	profile_settingsSave();
	profile_settingsAssign(setting, value, false);
}

function profile_settingsLoad(){
	var settings = JSON.parse(getCookie('settings'));

	if(!settings) {
		profile_settingsSave();
		profile_settingsLoad();
		return
	}

	Object.keys(settings).forEach(function(item){
		if(profile_settings[item] !== undefined){
			profile_settings[item].value = settings[item];
		}
	});

	var new_settings = false;

	Object.keys(profile_settings).forEach(function(item){
		profile_settingsAssign(item, profile_settings[item].value, true);

		if(settings[item] === undefined && profile_settings[item].type == 'cookie') new_settings = true;
	});

	if(new_settings) return profile_settingsSave();
}

function profile_settingsAssign(setting, value, first){
	if(setting == 'sounds' || setting == 'anonymous' || setting == 'private') $('.change-setting[data-setting="' + setting + '"]').prop('checked', (value == '1'));

	switch(setting) {
		case 'sounds':
			$('#profile_setting_sounds').prop('checked', (value == '1'));

			audio_volume = (value == '1') ? 0.75 : 0;

			break;

		case 'channel':
			$('#chat_channel').val(value);

			var $field = $('#chat_channel').closest('.dropdown_field');
			changeDropdownFieldElement($field);

			break;

		case 'chat':
			if(isOnMobile() && first) resize_pullout('chat', true);
			else resize_pullout('chat', value == '1');

			break;

		case 'anonymous':
			break;

		case 'private':
			break;

		case 'balance':
			$('.balances .balance[data-type="total"] .amount').countToFloat(roundedToFixed($('.balances .list .balance[data-type="' + value + '"]').attr('data-balance'), 2));

			break;

		case 'history':
			$('.bet-select .history-load').removeClass('active');
			$('.bet-select .history-load[data-type="' + value + '"]').addClass('active');

			break;
	}
}

function profile_settingsSave(){
	var settings = {};

	Object.keys(profile_settings).forEach(function(item){
		if(profile_settings[item].type == 'cookie') {
			settings[item] = profile_settings[item].value;
		}
	});

	setCookie('settings', JSON.stringify(settings));
}

function profile_settingsGet(setting){
	if(profile_settings[setting] === undefined) return '';

	return profile_settings[setting].value;
}

/* SOCKET */

$(document).ready(function() {
	profile_settingsLoad();
	sounds_initialize();

	connect_socket();

	//EXCLUSION
	$('.self_exclision').on('click', function(){
		var exclusion = $(this).data('exclusion');

		confirm_action(function(confirmed){
			if(!confirmed) return;

			requestRecaptcha(function(render){
				send_request_socket({
					'type': 'account',
					'command': 'exclusion',
					'exclusion': exclusion,
					'recaptcha': render
				});
			});
		});
	});

	//REMOVE SESSIONS
	$('.remove_session').on('click', function(){
		var session = $(this).data('session');

		confirm_action(function(confirmed){
			if(!confirmed) return;

			send_request_socket({
				'type': 'account',
				'command': 'remove_session',
				'session': session
			});
		});
	});

    $('#remove_sessions').on('click', function(){
		confirm_action(function(confirmed){
			if(!confirmed) return;

			send_request_socket({
				'type': 'account',
				'command': 'remove_sessions'
			});
		});
	});

	//ENABLE EMAIL VERIFICATION
	$('#enable_email_verification').on('click', function(){
		send_request_socket({
            'type': 'account',
            'command': 'enable_email_verification'
        });
	});

    //ACTIVATE EMAIL VERIFICATION
    $('#activate_email_verification').on('click', function(){
        var code = $('#email_verification_code').val();

		send_request_socket({
            'type': 'account',
            'command': 'activate_email_verification',
            'code': code
        });
	});

	//DISABLE EMAIL VERIFICATION
	$('#disable_email_verification').on('click', function(){
		confirm_action(function(confirmed){
			if(!confirmed) return;

            send_request_socket({
                'type': 'account',
                'command': 'disable_email_verification'
            });
        });
	});

    //ENABLE AUTHENTICATOR APP
	$('#enable_authenticator_app').on('click', function(){
		send_request_socket({
            'type': 'account',
            'command': 'enable_authenticator_app'
        });
	});

    //ACTIVATE AUTHENTICATOR APP
    $('#activate_authenticator_app').on('click', function(){
        var token = $('#authenticator_app_token').val();

		send_request_socket({
            'type': 'account',
            'command': 'activate_authenticator_app',
            'token': token
        });
	});

	//DISABLE AUTHENTICATOR APP
	$('#disable_authenticator_app').on('click', function(){
		confirm_action(function(confirmed){
			if(!confirmed) return;

            send_request_socket({
                'type': 'account',
                'command': 'disable_authenticator_app'
            });
        });
	});

	//MANAGE AUTHENTICATOR APP
	$('#manage_authenticator_app').on('click', function(){
		send_request_socket({
            'type': 'account',
            'command': 'manage_authenticator_app'
        });
	});

	//GENERATE CODES AUTHENTICATOR APP
	$('#generate_codes_authenticator_app').on('click', function(){
		send_request_socket({
            'type': 'account',
            'command': 'generate_codes_authenticator_app'
        });
	});

	//TWOFA PRIMARY METHOD
	$('.twofa_primary_method').on('click', function(){
		var method = $(this).attr('data-method');

        send_request_socket({
            'type': 'account',
            'command': 'twofa_primary_method',
            'method': method
        });
	});

    //SHOW / HIDE TWOFA METHOD OPTIONS
	$(document).on('click', '.method-open-menu', function() {
		if($(this).closest('.security-method').find('.method-menu').hasClass('hidden')){
			$('.method-menu:not(.hidden)').each(function(i, e) {
				var $MENU = $(this);

				$MENU.css('opacity', 0);

				setTimeout(function(){
					$MENU.addClass('hidden');
				}, 200);
			});

			var $MENU = $(this).closest('.security-method').find('.method-menu');

			$MENU.removeClass('hidden');

			setTimeout(function(){
				$MENU.css('opacity', 1);
			}, 10);
		}
	});

	$(document).on('click', ':not(.method-open-menu):not(.method-open-menu > *):not(.method-menu)', function(e) {
		if(e.target !== this) return;

		$('.method-menu:not(.hidden)').each(function(i, e) {
			var $MENU = $(this);

			$MENU.css('opacity', 0);

			setTimeout(function(){
				$MENU.addClass('hidden');
			}, 200);
		});
	});

	//PULLOUT
	$('.pullout_view').on('click', function(){
		var pullout = $(this).data('pullout');

		var hide = $('#page').hasClass(pullout + '-active');

		if(pullout == 'menu' || pullout == 'admin') resize_pullout(pullout, hide);
		else profile_settingsChange(pullout, hide ? '1' : '0');
	});

	var last_width = $(window).width();
	$(window).resize(function(){
		if(last_width != $(window).width()){
			last_width = $(window).width();

			resize_pullout('chat', profile_settings['chat'].value == '1');
		}
	});

	//PROFILE SETTINGS
	$('.change-setting').on('change', function(){
		var setting = $(this).data('setting');

		if(profile_settings[setting].type == 'cookie') {
			profile_settingsChange(setting, (profile_settings[setting].value == '1') ? '0' : '1');
		} else {
			profile_settings[setting].value = (profile_settings[setting].value == '1') ? '0' : '1';

			send_request_socket({
				'type': 'account',
				'command': 'profile_settings',
				'data': {
					'setting': setting,
					'value': profile_settings[setting].value
				}
			});

			profile_settingsAssign(setting, profile_settings[setting].value, false);
		}
	});

	//SWITCH PANELS
	$(document).on('click', '.switch_panel', function() {
		var id = $(this).data('id');
		var panel = $(this).data('panel');

		$('.switch_panel[data-id="' + id + '"]').removeClass('active');
		$(this).addClass('active');

		$('.switch_content[data-id="' + id + '"]').addClass('hidden');
		$('.switch_content[data-id="' + id + '"][data-panel="' + panel + '"]').removeClass('hidden');
	});

	//SAVE EMAIL
	$(document).on('click', '#save_account_email', function() {
		var email = $(this).closest('.input_field').find('.account_email').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'account',
				'command': 'save_email',
				'email': email,
				'recaptcha': render
			});
		});
	});

	//AFFILIATES
	$(document).on('click', '#collect_affiliates_referral_available', function() {
		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'affiliates',
				'command': 'collect',
				'recaptcha': render
			});
		});
	});

	//REWARDS
	$(document).on('click', '#collect_reward_bind', function() {
		var bind = $(this).data('bind');

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'bind',
				'data': {
					'bind': bind
				},
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#collect_reward_referral_redeem', function() {
		var code = $('#referral_redeem_code').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'referral_redeem',
				'data': {
					'code': code
				},
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#collect_reward_referral_create', function() {
		var code = $('#referral_create_code').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'referral_create',
				'data': {
					'code': code
				},
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#collect_reward_bonus_redeem', function() {
		var code = $('#bonus_redeem_code').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'bonus_redeem',
				'data': {
					'code': code
				},
				'recaptcha': render
			});
		});
	});

    $(document).on('click', '#bonus_create_generate', function() {
		$('#bonus_create_code').val(generateCode(6));
        changeInputFieldLabel($('#bonus_create_code').closest('.input_field'));
	});

	$(document).on('click', '#collect_reward_bonus_create', function() {
		var code = $('#bonus_create_code').val();
		var amount = $('#bonus_create_amount').val();
		var uses = $('#bonus_create_uses').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'bonus_create',
				'data': {
					'code': code,
					'amount': amount,
					'uses': uses
				},
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#collect_reward_daily', function() {
		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rewards',
				'command': 'daily_redeem',
				'data': {},
				'recaptcha': render
			});
		});
	});

	$(document).on('hide', '#modal_recaptcha', function(){
		grecaptcha.reset(RECAPTCHA);
		$('#modal_recaptcha .modal-body').html('<div class="flex justify-center" id="g-recaptcha"></div>');
	});
});

//CONNECT
var disconnected = false;
function connect_socket() {
	if(!SOCKET) {
		var session = getCookie('session');

		// When behind a reverse proxy (nginx), use relative URL so Socket.IO
		// connects to the same origin (port 8080) instead of internal port (3000).
		// Extract port from current window location if available, otherwise use app.port.
		var socketUrl = '';
		if (typeof window !== 'undefined' && window.location) {
			// Use same origin (relative URL) - works correctly behind nginx reverse proxy
			socketUrl = '';
		} else {
			// Fallback for non-browser environments
			socketUrl = ':' + app.port;
		}

		if(app.secure) SOCKET = io(socketUrl, {
            transports: ['polling', 'websocket'],
            secure: true,
            withCredentials: true
        });
		else SOCKET = io(socketUrl, {
			transports: ['polling', 'websocket']
		});

		$('.status-server *').addClass('hidden');
		$('.status-server *[data-status="connecting"]').removeClass('hidden');

		SOCKET.on('connect', function(message) {
			SOCKET.emit('join', {
				session: session,
				paths: app.paths,
				history: profile_settingsGet('history'),
				channel: profile_settingsGet('channel')
			});

			$('.status-server *').addClass('hidden');
			$('.status-server *[data-status="running"]').removeClass('hidden');

			$('#toast-container .toast').remove();

			if(disconnected) disconnected = false;
		});
		SOCKET.on('message', function(message) {
			if(message.data === undefined) onMessageSocket(message.type, message.method);
			else onMessageSocket(message.type, message.method, message.data);
		});
		SOCKET.on('connect_error', function(message) {
			if(disconnected) return;

			toastr['warning']('Reconnecting!', '', {
				timeOut: 0,
				extendedTimeOut: 0
			});

			$('.status-server *').addClass('hidden');
			$('.status-server *[data-status="connection_lost"]').removeClass('hidden');

			disconnected = true;
		});
	}
}

//SENT REQUEST
function send_request_socket(request) {
	if (SOCKET) {
		SOCKET.emit('request', request);
	}
}

function requestRecaptcha(callback){
	$('#modal_recaptcha').modal('show');

	var id = 'g-recaptcha-' + Math.floor(Math.random() * 100000);
	$('#g-recaptcha').html('<div id="' + id + '"></div>');

	RECAPTCHA = grecaptcha.render(id, {
		'sitekey': app.recaptcha.public_key,
		'callback': function() {
			var render = grecaptcha.getResponse(RECAPTCHA);

			callback(render);

			setTimeout(function(){
				$('#modal_recaptcha').modal('hide');

				grecaptcha.reset(RECAPTCHA);
				$('#modal_recaptcha .modal-body').html('<div class="flex justify-center" id="g-recaptcha"></div>');
			}, 1000);
		},
		'theme' : 'dark'
	});
}

//GET REQUEST
function onMessageSocket(type, method, data) {
	if(type == 'site'){
		if(method == 'connected' && !INITIALIZED && !data.maintenance){
            INITIALIZED = true;

			USERID = data.user.userid;

			$('#level_count').text(data.user.level.level);
			$('#level_bar').css('width', roundedToFixed((data.user.level.have - data.user.level.start) / (data.user.level.next - data.user.level.start) * 100, 2).toFixed(2) + '%');

			Object.keys(data.user.settings).forEach(function(item){
				if(profile_settings[item] !== undefined){
					profile_settings[item].value = data.user.settings[item];

					profile_settingsAssign(item, data.user.settings[item], true);
				}
			});

			data.user.balances.forEach(function(item){
				if(item.balance != BALANCES[item.type]){
					$('.balances .list > .balance[data-type="' + item.type + '"]').attr('data-balance', getFormatAmountString(item.balance));
                    $('.balances .list > .balance[data-type="' + item.type + '"] .amount').countToBalance(item.balance);

                    if(item.type == profile_settingsGet('balance')) $('.balances > .balance[data-type="total"] .amount').countToBalance(item.balance);

                    BALANCES[item.type] = item.balance;
                }
			});

			chat_ignoreList = data.chat.listignore;

			$('#chat-area').empty();

			data.chat.messages.forEach(function(message){
				chat_message(message);
			});

			games_intervalAmounts = data.amounts;
			Object.keys(games_intervalAmounts).forEach(function(item){
				var $field = $('.field_element_input[data-amount="' + item + '"]').closest('.input_field');

				if($field.length > 0) changeInputFieldLabel($field);
			});

			games_houseEdges = data.house_edges;

			/* FIRST REQUESTS */

            if((app.paths[0] == 'deposit' || app.paths[0] == 'withdraw') && app.paths.length > 1){
            }

            if(app.paths[0] == 'admin'){
				if(data.user.authorized.admin) {

					if(app.paths.length > 1 && app.paths[1] == 'dashboard'){
						dashboard_initialize();
					}
				}
            }

            if(app.paths[0] == 'account' && app.paths.length > 1){
            }

            if(app.paths[0] == 'casino'){
                if(app.paths[1] == 'slots' || app.paths[1] == 'live' || app.paths[1] == 'favorites'){
                    if(app.paths[1] == 'slots' && app.paths.length > 3){
                        $('#casino_game').html('<div class="flex flex-1 items-center justify-center size-full text-center text-xl p-4">' + createLoader() + '</div>');

                        send_request_socket({
                            'type': 'casino',
                            'command': 'launch_demo',
                            'id': app.paths[2]
                        });
                    } else if(app.paths[1] == 'slots' && app.paths.length > 2){
                        $('#casino_game').html('<div class="flex flex-1 items-center justify-center size-full text-center text-xl p-4">' + createLoader() + '</div>');

                        send_request_socket({
                            'type': 'casino',
                            'command': 'launch_real',
                            'id': app.paths[2]
                        });
                    } else if(app.paths[1] == 'slots') {
                        var order = parseInt($('#casino_slots_games_order').val());
                        var provider = $('#casino_slots_games_provider').val();
                        var search = $('#casino_slots_games_search').val();

                        send_request_socket({
                            'type': 'pagination',
                            'command': 'casino_slots_games',
                            'page': 1,
                            'order': order,
                            'provider': provider,
                            'search': search
                        });
                    } else if(app.paths[1] == 'live') {
                        var order = parseInt($('#casino_live_games_order').val());
                        var provider = $('#casino_live_games_provider').val();
                        var search = $('#casino_live_games_search').val();

                        send_request_socket({
                            'type': 'pagination',
                            'command': 'casino_live_games',
                            'page': 1,
                            'order': order,
                            'provider': provider,
                            'search': search
                        });
                    } else if(app.paths[1] == 'favorites') {
                        var order = parseInt($('#casino_favorites_games_order').val());
                        var provider = $('#casino_favorites_games_provider').val();
                        var search = $('#casino_favorites_games_search').val();

                        send_request_socket({
                            'type': 'pagination',
                            'command': 'casino_favorites_games',
                            'page': 1,
                            'order': order,
                            'provider': provider,
                            'search': search
                        });
                    }
                }
            }

            if(app.paths[0] == 'user' && app.paths.length > 2){
            }

			/* END FIRST REQUESTS */

            if(app.page == 'crash' && data.crash !== undefined){
				$('#crash_graph').replaceWith(crashGraph());

                if(data.crash.fair.id !== undefined) {
                    $('#crash_fair_id').val(data.crash.fair.id);
                    $('#crash_fair_id').attr('data-default', data.crash.fair.id);
                }

				if(data.crash.fair.public_seed !== undefined) {
                    $('#crash_fair_public_seed').val(data.crash.fair.public_seed);
                    $('#crash_fair_public_seed').attr('data-default', data.crash.fair.public_seed);
                }

				$('#crash_history').empty();

				data.crash.history.forEach(function(crash){
					crashGame_addHistory(crash);
				});

				if(data.crash.bets.length > 0){
					$('#crash_betlist').empty();

					data.crash.bets.forEach(function(bet){
						crashGame_addGame(bet);
					});
				} else {
					$('#crash_betlist').html(emptyTable({
						title: 'No active bets'
					}));
				}

			}

            if(app.page == 'coinflip' && data.coinflip !== undefined){
				// Clear existing content
				$('#coinflip_betlist').empty();
				$('#coinflip_empty_state').addClass('hidden');
				
				// Stop any existing simulated bot flip interval
				if(window.coinflipSimulatedBotInterval) {
					clearInterval(window.coinflipSimulatedBotInterval);
					window.coinflipSimulatedBotInterval = null;
				}
				
				// Log initial flips count for debugging
				var flipsLength = data.coinflip.bets ? data.coinflip.bets.length : 0;
				console.log('[COINFLIP] Initial flips loaded:', flipsLength);
				
				if(flipsLength === 0) {
					// Inject simulated bot flips when API returns empty
					coinflipInjectSimulatedBots();
				} else {
					// Hide simulated subtitle
					$('#coinflip_simulated_subtitle').addClass('hidden');
					
					// Add skeleton placeholders
					for(var i = 0; i < 5; i++){
						$('#coinflip_betlist').append('<div class="coinflip-game bg-secondary rounded-2 border-2 border-card"></div>');
					}
					
					// Render all flips
					data.coinflip.bets.forEach(function(bet){
						coinflipGame_addCoinFlip(bet);
						if(bet.status > 0) coinflipGame_editCoinFlip(bet);
					});
				}
			}

            if(app.page == 'minesweeper' && data.minesweeper !== undefined){
				$('#minesweeper_bombs .item').removeClass('danger').removeClass('success').addClass('disabled');
				$('#minesweeper_bombs .item .multiplier').text('');

				$('#minesweeper_bet').removeClass('hidden').removeClass('disabled');
				$('#minesweeper_cashout').addClass('hidden');

				$('.bet-cashout').addClass('disabled');

				if(data.minesweeper.game.active){
					$('#minesweeper_bombs .item').removeClass('disabled');

					$('#minesweeper_bet').addClass('hidden');
					$('#minesweeper_cashout').removeClass('hidden').removeClass('disabled');

					$('#bombsamount_minesweeper').closest('.input_field').addClass('disabled');
					$('.minesweeper-bombsamount').addClass('disabled');

					$('.bet-cashout').removeClass('disabled');

					$('#minesweeper_cashout_amount').countToFloat(data.minesweeper.game.total);
					$('#minesweeper_cashout_profit').countToProfit(data.minesweeper.game.profit);

					data.minesweeper.game.route.forEach(function(button, stage){
						$('#minesweeper_bombs .item[data-bomb="' + button + '"]').addClass('success');
						$('#minesweeper_bombs .item[data-bomb="' + button + '"] .multiplier').text('x' + data.minesweeper.game.multipliers[stage].toFixed(2));
					});
				}
			}

            if(app.page == 'tower' && data.tower !== undefined){
				$('#tower_grid .item').removeClass('danger').removeClass('success').removeClass('checked');
				$('#tower_grid .item').addClass('disabled');

				$('#tower_bet').removeClass('hidden');
				$('#tower_cashout').addClass('hidden');

				$('.bet-cashout').addClass('disabled');

				towerGame_multipliers = data.tower.multipliers;

				if(data.tower.game.active){
					towerGame_difficulty = data.tower.game.difficulty;

					$('#tower_difficulty').closest('.dropdown_field').addClass('disabled');
				}

				towerGame_generateTiles();

				if(data.tower.game.active){
					$('#tower_bet').addClass('hidden');
					$('#tower_cashout').removeClass('hidden').removeClass('disabled');

					$('#tower_difficulty').closest('.dropdown_field').addClass('disabled');

					$('.bet-cashout').removeClass('disabled');

					$('#tower_cashout_amount').countToFloat(data.tower.game.total);
					$('#tower_cashout_profit').countToProfit(data.tower.game.profit);

					data.tower.game.route.forEach(function(button, stage){
						$('#tower_grid .item[data-stage="' + stage + '"][data-button="' + button + '"]').addClass('success').removeClass('disabled');
						$('#tower_grid .item[data-stage="' + stage + '"]:not(.success)').addClass('checked').removeClass('disabled');
					});

					$('#tower_grid .item[data-stage="' + data.tower.game.route.length + '"]').removeClass('disabled');

					towerGame_generateAmounts(data.tower.game.amount);
				} else towerGame_generateAmounts(0.01);
			}

            if(app.page == 'blackjack' && data.blackjack !== undefined){
                blackjack_applyState(data.blackjack.game);
            }

            if(app.page == 'casino' && data.casino !== undefined){

			}

            if(app.page == 'deposit' || app.page == 'withdraw'){
                if(app.paths[1] == 'crypto'){
					offers_currencyAmounts = data.offers.crypto.amounts;
					offers_currencyFees = data.offers.crypto.fees;

					if(app.paths.length > 1) $('.crypto-panel [data-conversion="from"]').trigger('input');
				}

			}
		} else if(method == 'online'){
			Object.keys(data.online).forEach(function(item){
				$('.online[data-channel="' + item + '"]').text(data.online[item]);
			});
		} else if(method == 'notify'){

		} else if(method == 'reload'){
			location.reload();
		} else if(method == 'refresh'){
			//site_refresh();
		}
	} else

	if(type == 'message'){
		if(method == 'info'){
			notify('info', data.message);
		} else if(method == 'success'){
			notify('success', data.message);
		} else if(method == 'error'){

            if(app.page == 'casino' && app.paths.length > 2){
				$('#casino_game').html('<div class="flex flex-1 items-center justify-center size-full text-center text-xl p-4">' + data.message + '</div>');
			} else

            notify('error', data.message);

            switch(app.page){

                case 'crash':
                    $('#crash_bet.disabled').removeClass('disabled');
                    $('#crash_cashout.disabled').removeClass('disabled');

                    break;

                case 'coinflip':
                    $('#coinflip_create.disabled').removeClass('disabled');
                    $('.coinflip-join.disabled').removeClass('disabled');

                    break;

                case 'blackjack':
                    $('#blackjack_bet.disabled').removeClass('disabled');
                    $('#blackjack_hit.disabled').removeClass('disabled');
                    $('#blackjack_stand.disabled').removeClass('disabled');

                    break;

                case 'minesweeper':
                    $('#minesweeper_bet.disabled').removeClass('disabled');
                    $('#minesweeper_cashout.disabled').removeClass('disabled');

                    break;

                case 'tower':
                    $('#tower_bet.disabled').removeClass('disabled');
                    $('#tower_cashout.disabled').removeClass('disabled');

                    break;

            }

			sounds_play('error');
		}
	} else

	if(type == 'user'){
		if(method == 'balance'){
            if(data.balance.balance != BALANCES[data.balance.type]){
                $('.balances .list > .balance[data-type="' + data.balance.type + '"]').attr('data-balance', getFormatAmountString(data.balance.balance));
                $('.balances .list > .balance[data-type="' + data.balance.type + '"] .amount').countToBalance(data.balance.balance);

                if(data.balance.type == profile_settingsGet('balance')) $('.balances > .balance[data-type="total"] .amount').countToBalance(data.balance.balance);

                BALANCES[data.balance.type] = data.balance.balance;
            }
		} else if(method == 'level'){
			$('#level_count').text(data.level.level);
			$('#level_bar').css('width', roundedToFixed((data.level.have - data.level.start) / (data.level.next - data.level.start) * 100, 2).toFixed(2) + '%');
		}
	} else

	if(type == 'account' && app.page == 'account'){
		if(method == 'remove_session'){
			$('#my_devices > .table-row[data-session="' + data.session + '"]').remove();

			if($('#my_devices > .table-row').length <= 0) {
				$('#my_devices').html(emptyTable({
					title: 'No data found'
				}));
			}
		} else if(method == 'email_verification'){
            $('#modal_twofa_email_verification').modal('show');
        } else if(method == 'authenticator_app'){
            $('#authenticator_app_secret').text(data.secret);
            $('#authenticator_app_secret_copy').attr('data-text', data.secret);

            $('#authenticator_app_qrcode').empty();

            var qrcode = new QRCode($('#authenticator_app_qrcode')[0], {
                text: data.url,
                width: 192,
                height: 192
            });

            $('#modal_twofa_authenticator_app').modal('show');
        } else if(method == 'authenticator_app_codes'){
            $('#authenticator_app_codes').empty();
            data.codes.forEach(function(item){
                if(item.used) $('#authenticator_app_codes').append('<div class="bg-card bg-opacity-50 rounded-2 p-2 text-center disabled">' + item.code + '</div>');
                else $('#authenticator_app_codes').append('<div class="bg-card bg-opacity-50 rounded-2 p-2 text-center">' + item.code + '</div>');
            });

            $('#authenticator_app_codes_copy').attr('data-text', data.codes.map(a => a.code).join('\n'));
            $('#authenticator_app_codes_download').attr('data-text', data.codes.map(a => a.code).join('\n'));

            $('#modal_twofa_authenticator_app_codes').modal('show');
        } else if(method == 'enable_twofa_method'){
            $('.account-security .security-method[data-method="' + data.method + '"]').addClass('enabled');

            $('#modal_twofa_email_verification').modal('hide');
            $('#modal_twofa_authenticator_app').modal('hide');
        } else if(method == 'disable_twofa_method'){
            $('.account-security .security-method[data-method="' + data.method + '"]').removeClass('enabled').removeClass('primary');
        } else if(method == 'primary_twofa_method'){
            $('.account-security .security-method').removeClass('primary');
            $('.account-security .security-method[data-method="' + data.method + '"]').addClass('primary');
        }
	} else

	if(type == 'modal'){
		if(method == 'insufficient_balance'){
			$('#modal_error_insufficient_balance .amount').text(getFormatAmountString(data.amount));

			$('#modal_error_insufficient_balance').modal('show');
		} else

        if(method == 'withdraw_rollover'){
            $('#modal_error_withdraw_rollover .amount').text(getFormatAmountString(data.amount));

			$('#modal_error_withdraw_rollover').modal('show');
		} else if(method == 'auth'){
			$('#modal_error_auth').modal('show');
		} else

        if(method == 'command_online'){
			if(data.list.length > 0){
				$('#online_list').empty();

				data.list.sort((a, b) => a.level - b.level).sort((a, b) => a.rank - b.rank).sort((a, b) => b.guest - a.guest).forEach(function(item){
					var DIV = '<div class="flex justify-center items-center size-full">';
						DIV += '<a href="/user/' + item.user.userid + '" target="_blank">' + createAvatarField(item.user, 'medium', '', '') + '</a>';
					DIV += '</div>';

					$('#online_list').prepend(DIV);
				});
			} else {
				$('#online_list').html(emptyState({
					title: 'No players online'
				}));
			}

			$('#modal_command_online').modal('show');
		} else if(method == 'command_help'){
			if(data.commands.length > 0) {
				$('#chat_commands').empty();

				data.commands.forEach(function(item){
					var name = item.command;
					if(item.arguments.length > 0) name += ' ' + item.arguments.join(' ').replaceAll('<', '&lt').replaceAll('>', '&gt');

					var DIV = '<div class="acordeon-item transition duration-200">';
						DIV += '<div class="acordeon-trigger text-base tracking-wider p-4 pointer">/' + name + '</div>';

						DIV += '<div class="acordeon-content transition duration-200 overflow-hidden px-4">';
							DIV += '<div class="flex flex-col gap-2 pb-4">';
								item.help.forEach(function(help){
									DIV += '<div>' + help.replaceAll('<', '&lt').replaceAll('>', '&gt') + '</div>';
								});
							DIV += '</div>';
						DIV += '</div>';
					DIV += '</div>';

					$('#chat_commands').append(DIV);
				});
			} else {
				$('#chat_commands').html(emptyState({
					title: 'No commands available'
				}));
			}

			$('#modal_command_help').modal('show');
		} else if(method == 'command_tip'){
			$('#tip_player_avatar').html(createAvatarField(data.user, 'small', '', ''));
			$('#tip_player_name').text(data.user.name);
			$('#send_tip_player').attr('data-userid', data.user.userid);

			$('#modal_command_tip').modal('show');
		} else if(method == 'command_mute'){
			$('#mute_player_avatar').html(createAvatarField(data.user, 'small', '', ''));
			$('#mute_player_name').text(data.user.name);
			$('#mute_player_set').attr('data-userid', data.user.userid);
			$('#mute_player_permanently').attr('data-userid', data.user.userid);

			$('#modal_command_mute').modal('show');
		} else if(method == 'command_ignorelist'){
			if(data.list.length > 0){
				$('#chat_ignorelist').empty();

				data.list.forEach(function(item){
					chat_addIgnore(item.user, item.time);
				});
			} else {
				$('#chat_ignorelist').html(emptyState({
					title: 'No ignored players'
				}));
			}

			$('#modal_command_ignorelist').modal('show');
		}
	} else

	if(type == 'rewards' && app.page == 'rewards'){
		if(method == 'timer'){
			var time_daily = data.time;

			clearInterval(interval_daily);

			var interval_daily = setInterval( function(){
				if(time_daily <= 0){
					$('#collect_reward_daily').text('Collect').removeClass('disabled');
					clearInterval(interval_daily);

					return;
				}

				$('#collect_reward_daily').text(getFormatSeconds(time_daily).hours + ':' + getFormatSeconds(time_daily).minutes + ':' + getFormatSeconds(time_daily).seconds).addClass('disabled');
				time_daily--;
			},1000);
		}
	} else

	if(type == 'chat'){
		if(method == 'message'){
			chat_message(data.message);
		} else if(method == 'messages'){
			$('#chat-area').empty();

			data.messages.forEach(function(message){
				chat_message(message);
			});
		} else if(method == 'delete'){
			$('.chat-message[data-message="' + data.id + '"]').remove();
		} else if(method == 'ignorelist'){
			chat_ignoreList = data.list;

			$('#chat_ignorelist .chat-ignore').each(function(i, e){
				if(!chat_ignoreList.includes($(this).attr('data-userid'))) $(this).remove();
			});

			if($('#chat_ignorelist .chat-ignore').length <= 0) {
				$('#chat_ignorelist').html(emptyState({
					title: 'No ignored players'
				}));
			}
		} else if(method == 'clean'){
			$('#chat-area').empty();
		} else if(method == 'channel'){
			$('#chat-area').empty();

			profile_settingsChange('channel', data.channel);

			data.messages.forEach(function(message){
				chat_message(message);
			});
		} else if(method == 'commands'){
			$('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').empty();

			if(!data.message['private']) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<a class="chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" href="/user/' + data.message.user.userid + '"><i class="fa fa-user" aria-hidden="true"></i><span class="font-bold">View Profile</span></a>');
			$('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_write_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="@' + data.message.user.userid + '"><i class="fa fa-bell" aria-hidden="true"></i><span class="font-bold">Mention</span></div>');
			$('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_reply_message chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-reply="' + stringEscape(JSON.stringify({ id: data.message.id, message: data.message.message, user: { avatar: data.message.user.avatar, name: data.message.user.name } })) + '"><i class="fa fa-reply" aria-hidden="true"></i><span class="font-bold">Reply Message</span></div>');

			if(data.commands.some(a => a == 'tip')) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/tip ' + data.message.user.userid + '"><i class="fa fa-gift" aria-hidden="true"></i><span class="font-bold">Tip Player</span></div>');

			if(data.commands.some(a => a == 'ignore')) {
				if(data.ignored) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/unignore ' + data.message.user.userid + '"><i class="fa fa-eye" aria-hidden="true"></i><span class="font-bold">Unignore Player</span></div>');
				else $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/ignore ' + data.message.user.userid + '"><i class="fa fa-eye-slash" aria-hidden="true"></i><span class="font-bold">Ignore Player</span></div>');
			}

			if(data.commands.some(a => a == 'mute')) {
				if(data.muted) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/unmute ' + data.message.user.userid + '"><i class="fa fa-volume-up" aria-hidden="true"></i><span class="font-bold">Unute Player</span></div>');
				else $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/mute ' + data.message.user.userid + '"><i class="fa fa-volume-off" aria-hidden="true"></i><span class="font-bold">Mute Player</span></div>');
			}

			if(data.commands.some(a => a == 'pinmessage')) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/pinmessage ' + data.message.id + '"><i class="fa fa-flag" aria-hidden="true"></i><span class="font-bold">Pin Message</span></div>');
			if(data.commands.some(a => a == 'deletemessage')) $('#chat-area .chat-message[data-message="' + data.message.id + '"] .chat-message-menu').append('<div class="chat_send_command chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2" data-command="/deletemessage ' + data.message.id + '"><i class="fa fa-trash" aria-hidden="true"></i><span class="font-bold">Delete Message</span></div>');
		}
	} else

	if(type == 'rain'){
		if(method == 'started'){
			$('#chat_rain').removeClass('waiting').addClass('started');

			$('#chat_rain .started .amount').text(getFormatAmountString(data.amount));

			if(data.joined) {
				$('#chat_rain_join').addClass('hidden');
				$('#chat_rain_joined').removeClass('hidden');
			} else {
				$('#chat_rain_joined').addClass('hidden');
				$('#chat_rain_join').removeClass('hidden');
			}

			if(chat_rainInterval) clearInterval(chat_rainInterval);

			$('#chat_rain_progress').animate({
				'width': '0'
			}, {
				'duration': data.time * 1000,
				'easing': 'linear',
				'progress': function(animation, progress, remaining) {
					var las = remaining / 1000 * 100 / data.cooldown;

					$('#chat_rain_progress').css('width', las + '%');
				}
			});

			$('#chat_rain_tip').addClass('disabled');
		} else if(method == 'waiting'){
			$('#chat_rain').removeClass('started').addClass('waiting');

			if(chat_rainInterval) clearInterval(chat_rainInterval);

			if(data.last != null) {
				$('#chat_rain .waiting .description').removeClass('hidden');
				$('#chat_rain_first').addClass('hidden');

				var TIMER = '<script>';
					TIMER += 'var chat_rain_last = ' + data.last + ';';
					TIMER += 'chat_rainInterval = setInterval(function(){';
						TIMER += '$("#chat_rain_last").text(parseInt((time() - chat_rain_last) / 60) + " minutes ago");';
					TIMER += '}, 1000);';
				TIMER += '</script>';
				TIMER += '<span id="chat_rain_last">' + Math.floor((time() - data.last) / 60) + ' minutes ago</span>';

				$('#chat_rain_timer').html(TIMER);
			} else {
				$('#chat_rain .waiting .description').addClass('hidden');
				$('#chat_rain_first').removeClass('hidden');
			}

			$('#chat_rain .waiting .amount').countToFloat(data.amount);

			$('#chat_rain_progress').finish();

			$('#chat_rain_tip').removeClass('disabled');
		} else if(method == 'joined'){
			$('#chat_rain_join').addClass('hidden');
			$('#chat_rain_joined').removeClass('hidden');
		} else if(method == 'amount'){
			$('#chat_rain .waiting .amount').countToFloat(data.amount);
		}
	} else

	if(type == 'pagination'){
		if(method == 'admin_users'){
			pagination_addUsers(data.list);

			$('#pagination_admin_users').replaceWith(pageNavigator({
				id: 'pagination_admin_users',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'admin_crypto_confirmations'){
			pagination_addCryptoConfirmations(data.list);

			$('#pagination_admin_crypto_confirmations').replaceWith(pageNavigator({
				id: 'pagination_admin_crypto_confirmations',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'admin_tracking_links'){
			pagination_addTrackingLinks(data.list);

			$('#pagination_admin_tracking_links').replaceWith(pageNavigator({
				id: 'pagination_admin_tracking_links',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'admin_deposit_bonuses'){
			pagination_addDepositBonuses(data.list);

			$('#pagination_admin_deposit_bonuses').replaceWith(pageNavigator({
				id: 'pagination_admin_deposit_bonuses',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'account_transactions'){
			pagination_addAccountTransactions(data.list);

			$('#pagination_account_transactions').replaceWith(pageNavigator({
				id: 'pagination_account_transactions',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_deposits'){
			pagination_addAccountDeposits(data.list);

			$('#pagination_account_deposits').replaceWith(pageNavigator({
				id: 'pagination_account_deposits',
				page: data.page,
				pages: data.pages
			}));
		} else
        if(method == 'account_withdrawals'){
			pagination_addAccountWithdrawals(data.list);

			$('#pagination_account_withdrawals').replaceWith(pageNavigator({
				id: 'pagination_account_withdrawals',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_crash_history'){
			pagination_addAccountCrashHistory(data.list);

			$('#pagination_account_crash_history').replaceWith(pageNavigator({
				id: 'pagination_account_crash_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_coinflip_history'){
			pagination_addAccountCoinflipHistory(data.list);

			$('#pagination_account_coinflip_history').replaceWith(pageNavigator({
				id: 'pagination_account_coinflip_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_blackjack_history'){
			pagination_addAccountBlackjackHistory(data.list);

			$('#pagination_account_blackjack_history').replaceWith(pageNavigator({
				id: 'pagination_account_blackjack_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_tower_history'){
			pagination_addAccountTowerHistory(data.list);

			$('#pagination_account_tower_history').replaceWith(pageNavigator({
				id: 'pagination_account_tower_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_minesweeper_history'){
			pagination_addAccountMinesweeperHistory(data.list);

			$('#pagination_account_minesweeper_history').replaceWith(pageNavigator({
				id: 'pagination_account_minesweeper_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'account_casino_history'){
			pagination_addAccountCasinoHistory(data.list);

			$('#pagination_account_casino_history').replaceWith(pageNavigator({
				id: 'pagination_account_casino_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_transactions'){
			pagination_addUserTransactions(data.list);

			$('#pagination_user_transactions').replaceWith(pageNavigator({
				id: 'pagination_user_transactions',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_deposits'){
			pagination_addUserDeposits(data.list);

			$('#pagination_user_deposits').replaceWith(pageNavigator({
				id: 'pagination_user_deposits',
				page: data.page,
				pages: data.pages
			}));
		} else
        if(method == 'user_withdrawals'){
			pagination_addUserWithdrawals(data.list);

			$('#pagination_user_withdrawals').replaceWith(pageNavigator({
				id: 'pagination_user_withdrawals',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_crash_history'){
			pagination_addUserCrashHistory(data.list);

			$('#pagination_user_crash_history').replaceWith(pageNavigator({
				id: 'pagination_user_crash_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_coinflip_history'){
			pagination_addUserCoinflipHistory(data.list);

			$('#pagination_user_coinflip_history').replaceWith(pageNavigator({
				id: 'pagination_user_coinflip_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_blackjack_history'){
			pagination_addUserBlackjackHistory(data.list);

			$('#pagination_user_blackjack_history').replaceWith(pageNavigator({
				id: 'pagination_user_blackjack_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_tower_history'){
			pagination_addUserTowerHistory(data.list);

			$('#pagination_user_tower_history').replaceWith(pageNavigator({
				id: 'pagination_user_tower_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_minesweeper_history'){
			pagination_addUserMinesweeperHistory(data.list);

			$('#pagination_user_minesweeper_history').replaceWith(pageNavigator({
				id: 'pagination_user_minesweeper_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'user_casino_history'){
			pagination_addUserCasinoHistory(data.list);

			$('#pagination_user_casino_history').replaceWith(pageNavigator({
				id: 'pagination_user_casino_history',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'affiliates_referrals'){
			pagination_addAffiliatesReferrals(data.list);

			$('#pagination_affiliates_referrals').replaceWith(pageNavigator({
				id: 'pagination_affiliates_referrals',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'admin_gamebots'){
			pagination_addGamebots(data.list);

			$('#pagination_admin_gamebots').replaceWith(pageNavigator({
				id: 'pagination_admin_gamebots',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'casino_slots_games'){
			pagination_addCasinoSlotsGames(data.list);

            $('#casino_slots_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').html('<div class="field_element_dropdown active" value="all" data-index="0">All Providers</div>');

            data.providers.forEach(function(item, index){
                $('#casino_slots_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').append('<div class="field_element_dropdown" value="' + item.id + '" data-index="' + (index + 1) + '">' + item.name + '</div>');
            });

			$('#pagination_casino_slots_games').replaceWith(pageStepper({
				id: 'pagination_casino_slots_games',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'casino_live_games'){
			pagination_addCasinoLiveGames(data.list);

            $('#casino_live_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').html('<div class="field_element_dropdown active" value="all" data-index="0">All Providers</div>');

            data.providers.forEach(function(item, index){
                $('#casino_live_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').append('<div class="field_element_dropdown" value="' + item.id + '" data-index="' + (index + 1) + '">' + item.name + '</div>');
            });

			$('#pagination_casino_live_games').replaceWith(pageStepper({
				id: 'pagination_casino_live_games',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'casino_favorites_games'){
			pagination_addCasinoFavoritesGames(data.list);

            $('#casino_favorites_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').html('<div class="field_element_dropdown active" value="all" data-index="0">All Providers</div>');
            data.providers.forEach(function(item, index){
                $('#casino_favorites_games_provider').closest('.dropdown_field').find('.field_element_dropdowns').append('<div class="field_element_dropdown" value="' + item.id + '" data-index="' + (index + 1) + '">' + item.name + '</div>');
            });

			$('#pagination_casino_favorites_games').replaceWith(pageStepper({
				id: 'pagination_casino_favorites_games',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'casino_all_games'){
			pagination_addCasinoAllGames(data.list);

			$('#pagination_casino_all_games').replaceWith(pageStepper({
				id: 'pagination_casino_all_games',
				page: data.page,
				pages: data.pages
			}));
		} else

        if(method == 'support_requests'){
			pagination_addSupportRequests(data.list);

			$('#pagination_support_requests').replaceWith(pageNavigator({
				id: 'pagination_support_requests',
				page: data.page,
				pages: data.pages
			}));
		} else if(method == 'admin_support_requests'){
			pagination_addAdminSupportRequests(data.list);

			$('#pagination_admin_support_requests').replaceWith(pageNavigator({
				id: 'pagination_admin_support_requests',
				page: data.page,
				pages: data.pages
			}));
		}
	} else

	if(type == 'dashboard'){
		if(method == 'graph'){
            var graph = data.graph.split('.')[0];

            $('#dashboard_chart_' + graph).closest('.dashboard-chart').find('.dashboard-loader').addClass('hidden');

            dashboard_updateGraph(data.data, graph);
		} else if(method == 'stats'){
			$('.dashboard-stats[data-stats="' + data.stats + '"] .stats').text(data.data);
		}
	} else

	if(type == 'admin'){
        if(method == 'support_claim'){
            admin_supportSetStatus(data.closed, data.status);

            $('#admin_support_request_actions').removeClass('opened').addClass('claimed');
        } else if(method == 'support_release'){
            admin_supportSetStatus(data.closed, data.status);

            $('#admin_support_request_actions').removeClass('claimed').addClass('opened');
        } else if(method == 'support_close'){
            admin_supportSetStatus(data.closed, data.status);

            $('#admin_support_request_actions').removeClass('opened').removeClass('claimed').addClass('closed');

            $('#admin_support_request_updated').text(data.date);
        } else if(method == 'support_department'){
            $('#admin_support_request_department').text({ 0: 'General / Others', 1: 'Bug report', 2: 'Trade offer issue', 3: 'Improvements / Ideas', 4: 'Marketing / Partnership', 5: 'Ranking up' }[data.department]);

            $('#admin_support_request_updated').text(data.date);
        } else if(method == 'support_reply'){
            admin_supportAddReply(data);
            admin_supportSetStatus(data.closed, data.status);

            $('#admin_support_request_updated').text(data.date);
        } else if(method == 'settings_apply'){
			var $input = $('.admin_switch_settings[data-settings="' + data.settings + '"]');

			var status = $input.is(':checked');

			if(status) $input.removeAttr('checked');
			else $input.attr('checked', 'checked');
		}
    } else

    if(type == 'support'){
        if(method == 'redirect'){
			window.location.href = '/support/requests/' + data.id;
		} else if(method == 'department'){
            $('#support_request_department').text({ 0: 'General / Others', 1: 'Bug report', 2: 'Trade offer issue', 3: 'Improvements / Ideas', 4: 'Marketing / Partnership', 5: 'Ranking up' }[data.department]);

            $('#support_request_updated').text(data.date);
        } else if(method == 'reply'){
            support_addReply(data);
            support_setStatus(data.closed, data.status);

            $('#support_request_updated').text(data.date);
        } else if(method == 'close'){
            support_setStatus(data.closed, data.status);

            $('#support_request_actions').removeClass('opened').addClass('closed');

            $('#support_request_updated').text(data.date);
        }
    } else

    if(type == 'crash' && app.page == 'crash'){
		if(method == 'starting'){
			$('.crash-graph').removeClass('crashed');
			$('.crash-graph').removeClass('progress');
			$('.crash-graph').addClass('starting');

			crash_settings.stage = 'starting';

			var time_crash = data.time;
			var int_crash = setInterval(function(){
				if(time_crash < 0){
					clearInterval(int_crash);
				} else {
					$('#crash_timer').text(roundedToFixed(time_crash / 1000, 2).toFixed(2));

					time_crash -= 10;
				}
			}, 10);

			$('#crash_bet').removeClass('hidden').removeClass('disabled');
			$('#crash_cashout').addClass('hidden');

			$('.bet-cashout').addClass('disabled');

			$('#crash_cashout_amount').countToFloat(data.total);
			$('#crash_cashout_profit').countToProfit(data.profit);
		} else if(method == 'started'){
			$('.crash-graph').removeClass('starting');
			$('.crash-graph').removeClass('progress');
			$('.crash-graph').addClass('progress');

			crash_settings.stage = 'progress';
			crash_settings.start_time = new Date().getTime();
			crash_settings.difference_time = data.difference;

			$('#crash_bet').removeClass('hidden').addClass('disabled');
			$('#crash_cashout').addClass('hidden');

			$('.bet-cashout').addClass('disabled');
		} else if(method == 'crashed'){
			$('.crash-graph').removeClass('progress');
			$('.crash-graph').removeClass('starting');
			$('.crash-graph').addClass('crashed');

			crash_settings.current_progress_time = data.time;
			crash_settings.stage = 'crashed';

			$('#crash_crash').text(roundedToFixed(data.number / 100, 2).toFixed(2))

			if(!data.loaded) crashGame_addHistory(roundedToFixed(data.number / 100, 2).toFixed(2));

			$('#crash_bet').removeClass('hidden').addClass('disabled');
			$('#crash_cashout').addClass('hidden');

			$('.bet-cashout').addClass('disabled');

			if(!data.winners.includes(USERID)){
				$('#crash_cashout_amount').countToFloat(0);
				$('#crash_cashout_profit').countToProfit(0);
			}

			sounds_play('crash_stop');
		} else if(method == 'reset'){
			$('#crash_betlist').html(emptyTable({
				title: 'No active bets'
			}));

			$('#crash_bet').removeClass('hidden').removeClass('disabled');
			$('#crash_cashout').addClass('hidden');

			$('.bet-cashout').addClass('disabled');

			$('#crash_cashout_amount').countToFloat(0);
			$('#crash_cashout_profit').countToProfit(0);
		} else if(method == 'bet'){
			crashGame_addGame(data.bet);
		} else if(method == 'win'){
			crashGame_editBet(data.bet);
		} else if(method == 'loss'){
			data.ids.forEach(function(id){
				$('#crash_betlist > .table-row[data-id="' + id + '"]').removeClass('text-primary').addClass('text-danger');
			});
		} else if(method == 'bet_confirmed'){
			notify('success', 'Your bet has been placed!');

			$('#crash_bet').removeClass('hidden').addClass('disabled');
			$('#crash_cashout').addClass('hidden');

			$('.bet-cashout').addClass('disabled');

			$('#crash_cashout_amount').countToFloat(data.total);
			$('#crash_cashout_profit').countToProfit(data.profit);

			sounds_play('play');
		} else if(method == 'cashed_out'){
			$('#crash_bet').addClass('hidden');
			$('#crash_cashout').removeClass('hidden').addClass('disabled');

			$('.bet-cashout').addClass('disabled');

			$('#crash_cashout_amount').countToFloat(data.total);
			$('#crash_cashout_profit').countToProfit(data.profit);

			if(!data.loaded) sounds_play('cashout');
		} else if(method == 'cashout'){
			$('#crash_bet').addClass('hidden');
			$('#crash_cashout').removeClass('hidden').removeClass('disabled');

			$('.bet-cashout').removeClass('disabled');

			$('#crash_cashout_amount').text(roundedToFixed(data.total, 2).toFixed(2));
			$('#crash_cashout_profit').text(roundedToFixed(data.profit, 2).toFixed(2));
		} else if(method == 'fair'){
			if(data.id !== undefined) {
                $('#crash_fair_id').val(data.id);
                $('#crash_fair_id').attr('data-default', data.id);
            }

			if(data.public_seed !== undefined) {
                $('#crash_fair_public_seed').val(data.public_seed);
                $('#crash_fair_public_seed').attr('data-default', data.public_seed);
            }
		}
	} else

    if(type == 'coinflip' && app.page == 'coinflip'){
		if(method == 'add'){
			coinflipGame_addCoinFlip(data);
		} else if(method == 'bet_confirmed'){
			notify('success', 'Your bet has been placed!');

			$('#coinflip_create').removeClass('disabled');

			sounds_play('play');
		} else if(method == 'edit'){
			coinflipGame_editCoinFlip(data);
		} else if(method == 'remove'){
			var $field = $('#coinflip_betlist .coinflip-game .coinflip_betitem[data-id="' + data.id + '"]').parent();
			$field.removeClass('active').empty();

			// Check if we have any active flips left
			var activeFlips = $('#coinflip_betlist .coinflip-game.active').length;
			console.log('[COINFLIP] Active flips after remove:', activeFlips);
			
			if(activeFlips === 0) {
				// Show empty state if no flips remain
				$('#coinflip_empty_state').removeClass('hidden');
			}

			// Check if we have any active flips left
			var activeFlips = $('#coinflip_betlist .coinflip-game.active').length;
			console.log('[COINFLIP] Active flips after remove:', activeFlips);
			
			if(activeFlips === 0) {
				// Show empty state if no flips remain
				$('#coinflip_empty_state').removeClass('hidden');
			}

			var last_game = $('#coinflip_betlist .coinflip-game.active').last().index() + 1;
			var count_games = $('#coinflip_betlist .coinflip-game').length;
			for(var i = 0; (i < (count_games - (last_game > 5 ? 1 : 0)) * Math.floor((count_games - last_game) / 5) * 5) && $('#coinflip_betlist .coinflip-game').length > 5; i++){
				var $last = $('#coinflip_betlist .coinflip-game').last();

				$last.remove();
			}
		}
	} else

    if(type == 'blackjack' && app.page == 'blackjack'){
        if(method == 'bet_confirmed'){
            notify('success', 'Your bet has been placed!');
            blackjack_applyState(data.state);
            sounds_play('play');
        } else if(method == 'state'){
            blackjack_applyState(data.state);
        } else if(method == 'result'){
            blackjack_applyResult(data);
            sounds_play('cashout');
        }
    } else

    if(type == 'minesweeper' && app.page == 'minesweeper'){
		if(method == 'bet_confirmed'){
			notify('success', 'Your bet has been placed!');

			$('#minesweeper_bombs .item').removeClass('danger').removeClass('success').removeClass('disabled');
			$('#minesweeper_bombs .item .multiplier').text('');

			$('#minesweeper_bet').addClass('hidden');
			$('#minesweeper_cashout').removeClass('hidden').removeClass('disabled');

			$('#bombsamount_minesweeper').closest('.input_field').addClass('disabled');
			$('.minesweeper-bombsamount').addClass('disabled');

			$('.bet-cashout').removeClass('disabled');

			$('#minesweeper_cashout_amount').countToFloat(data.total);
			$('#minesweeper_cashout_profit').countToProfit(data.profit);

			sounds_play('play');
		} else if(method == 'result_bomb'){
			if(data.result == 'lose'){
				data.data.mines.forEach(function(bomb){
					$('#minesweeper_bombs .item[data-bomb="' + bomb + '"]').addClass('danger');
				});

				$('#minesweeper_bombs .item').addClass('disabled');

				$('#minesweeper_bet').removeClass('hidden').removeClass('disabled');
				$('#minesweeper_cashout').addClass('hidden');

				$('#bombsamount_minesweeper').closest('.input_field').removeClass('disabled');
				$('.minesweeper-bombsamount').removeClass('disabled');

				$('.bet-cashout').addClass('disabled');

				if(!data.data.win){
					$('#minesweeper_cashout_amount').countToFloat(0);
					$('#minesweeper_cashout_profit').countToProfit(0);

					sounds_play('minesweeper_loss');
				} else sounds_play('cashout');
			} else if(data.result == 'win'){
				$('#minesweeper_bombs .item[data-bomb="' + data.data.bomb + '"]').addClass('success');
				$('#minesweeper_bombs .item[data-bomb="' + data.data.bomb + '"] .multiplier').text('x' + data.data.multiplier.toFixed(2));

				$('#minesweeper_cashout').removeClass('hidden').removeClass('disabled');

				$('.bet-cashout').removeClass('disabled');

				$('#minesweeper_cashout_amount').countToFloat(data.data.total);
				$('#minesweeper_cashout_profit').countToProfit(data.data.profit);

				sounds_play('minesweeper_win');
			}
		}
	} else

    if(type == 'tower' && app.page == 'tower'){
		if(method == 'bet_confirmed'){
			notify('success', 'Your bet has been placed!');

			$('#tower_grid .item').removeClass('danger').removeClass('success').removeClass('checked');
			$('#tower_grid .item').addClass('disabled');

			$('#tower_grid .item[data-stage="' + data.stage + '"]').removeClass('disabled');

			$('#tower_bet').addClass('hidden');
			$('#tower_cashout').removeClass('hidden').removeClass('disabled');

			$('#tower_difficulty').closest('.dropdown_field').addClass('disabled');

			$('.bet-cashout').removeClass('disabled');

			$('#tower_cashout_amount').countToFloat(data.total);
			$('#tower_cashout_profit').countToProfit(data.profit);

			$('#tower_difficulty').closest('.dropdown_field').addClass('disabled');

			sounds_play('play');
		} else if(method == 'result_stage'){
			if(data.result == 'lose'){
				data.data.tower.forEach(function(button, i){
					if([ 'expert', 'master' ].includes(data.data.difficulty)){
						for(var j = 0; j < towerGame_tiles[data.data.difficulty]; j++){
							if(j != button) $('#tower_grid .item[data-stage="' + i + '"][data-button="' + j + '"]').removeClass('success').removeClass('checked').addClass('danger');
						}
					} else $('#tower_grid .item[data-stage="' + i + '"][data-button="' + button + '"]').removeClass('success').removeClass('checked').addClass('danger');
				});

				$('#tower_grid .item').addClass('disabled');

				$('#tower_bet').removeClass('hidden').removeClass('disabled');
				$('#tower_cashout').addClass('hidden');

				$('#tower_difficulty').closest('.dropdown_field').removeClass('disabled');

				$('.bet-cashout').addClass('disabled');

				if(!data.data.win){
					$('#tower_cashout_amount').countToFloat(0);
					$('#tower_cashout_profit').countToProfit(0);

					sounds_play('tower_loss');
				} else sounds_play('cashout');

				$('#tower_difficulty').closest('.dropdown_field').removeClass('disabled');
			} else if(data.result == 'win'){
				$('#tower_grid .item[data-stage="' + data.data.stage + '"][data-button="' + data.data.button + '"]').addClass('success');
				$('#tower_grid .item[data-stage="' + data.data.stage + '"]:not(.success)').addClass('checked');

				$('#tower_grid .item[data-stage="' + (data.data.stage + 1) + '"]').removeClass('disabled');

				$('#tower_cashout').removeClass('hidden').removeClass('disabled');

				$('.bet-cashout').removeClass('disabled');

				$('#tower_cashout_amount').countToFloat(data.data.total);
				$('#tower_cashout_profit').countToProfit(data.data.profit);

				sounds_play('tower_win');
			}
		}
	} else

    if(type == 'casino'){
        if(app.page == 'casino'){
            if(method == 'launch'){
                $('#casino_game').empty();

                var iframe = document.createElement('iframe');
                iframe.src = data.url;
                iframe.style.width = '100%';
                iframe.style.height = '600px';
                iframe.style.border = 'none';

                var container = document.getElementById('casino_game');
                container.appendChild(iframe);

                if(data.favorite) $('#casino_favorite.button').addClass('active');
            } else if(method == 'add_favorite'){
                $('.casino-games .item[data-id="' + data.id + '"] .favorite').addClass('active');

                $('#casino_favorite.button').addClass('active');
            } else if(method == 'remove_favorite'){
                $('.casino-games .item[data-id="' + data.id + '"] .favorite').removeClass('active');

                $('#casino_favorite.button').removeClass('active');
            }
        }

        if(method == 'add_favorite'){
            $('.casino-list .item[data-id="' + data.id + '"] .favorite').addClass('active');
        } else if(method == 'remove_favorite'){
            $('.casino-list .item[data-id="' + data.id + '"] .favorite').removeClass('active');
        }
    } else

    if(type == 'offers'){
		if(app.page == 'deposit' || app.page == 'withdraw'){

            if(method == 'crypto_payment'){
                $('#crypto_deposit_qrcode').empty();

				var qrcode = new QRCode($('#crypto_deposit_qrcode')[0], {
					text: data.payment.address,
					width: 192,
					height: 192
				});

                $('#crypto_deposit_payment_value').text(data.payment.value);
                $('#crypto_deposit_payment_amount').text(getFormatAmountString(data.payment.amount));

				var $input_address = $('#crypto_deposit_payment_address');
				$input_address.val(data.payment.address);

				changeInputFieldLabel($input_address.closest('.input_field'));

                $('#crypto_deposit_panel').addClass('active');
			}

		}

	} else

	if(type == 'history'){
		if(method == 'list'){
			if(data.list.length > 0){
				$('#history_list').empty();

				data.list.forEach(function(history){
					history_addHistory(history);
				});
			} else {
				$('#history_list').html(emptyTable({
					title: 'No data found'
				}));
			}
		} else if(method == 'history'){
			var allowed = true;

			if((data.history.type == 'game_bets' || data.history.type == 'my_bets') && data.history.game != app.page) allowed = false;

            //app.page == 'home'
			if(data.history.type == 'game_bets' && app.page == '') allowed = true;

			if(data.history.type == profile_settingsGet('history') && allowed) history_addHistory(data.history.history);
		}
	}
}

/* END SOCKET */

/* DASHBOARD */

var dashboard_charts = {};

$(document).ready(function() {
	$('.dashboard-chart').each(function(i, e) {
        $(this).find('.dashboard-loader').removeClass('hidden');

        dashboard_startGraph({ 'labels': [], 'data': [] }, $(this).attr('data-graph'));
    });

    $('.dashboard-graph').on('change', function() {
		var date = $(this).val();
		var graph = $(this).closest('.dashboard-chart').attr('data-graph');
		var id = $(this).closest('.dashboard-chart').attr('data-id');

		dashboard_loadGraph({ date, graph: id ? graph + '.' + id : graph });
	});
});

function dashboard_initialize(){
    var graphs = [];

    $('.dashboard-chart').each(function(i, e) {
        $(this).find('.dashboard-loader').removeClass('hidden');

        dashboard_updateGraph({ 'labels': [], 'data': [] }, $(this).attr('data-graph'));

        graphs.push({
            date: $(this).find('.dashboard-graph').val(),
            graph: ($(this).attr('data-id')) ? $(this).attr('data-graph') + '.' + $(this).attr('data-id') : $(this).attr('data-graph')
        });
    });

	send_request_socket({
		'type': 'dashboard',
		'command': 'graphs',
		'graphs': graphs
	});

    var stats = [];
    $('.dashboard-stats').each(function(i, e) { stats.push($(this).attr('data-stats')); });

    send_request_socket({
        'type': 'dashboard',
        'command': 'stats',
        'stats': stats
    });
}

function dashboard_loadGraph(graph){
	$('#dashboard_chart_' + graph.graph).closest('.dashboard-chart').find('.dashboard-loader').removeClass('hidden');

	dashboard_updateGraph({ 'labels': [], 'data': [] }, graph.graph.split('.')[0]);

	send_request_socket({
		'type': 'dashboard',
		'command': 'graph',
		'graph': graph
	});
}

function dashboard_startGraph(data, graph){
	$('#dashboard_chart_' + graph.graph).closest('.dashboard-chart').find('.dashboard-loader').removeClass('hidden');

    var ctx = document.getElementById('dashboard_chart_' + graph).getContext('2d');

	var chart = new Chart(ctx, dashboard_generateCtx(data));

    dashboard_charts[graph] = chart;
}

function dashboard_updateGraph(data, graph){
	if(dashboard_charts[graph] !== undefined){
        dashboard_charts[graph].data.labels = dashboard_generateCtx(data).data.labels;
        dashboard_charts[graph].data.datasets.splice(0);
        dashboard_charts[graph].data.datasets.push(dashboard_generateCtx(data).data.datasets[0]);

        dashboard_charts[graph].update();
    }
}

function dashboard_generateCtx(stats){
	return {
		type: 'line',
		data: {
			labels: stats.labels,
			datasets: [{
				data: stats.data,
				borderColor: '#9370db',
                backgroundColor: '#42395c',
				borderWidth: 2,
				fill: true,
				spanGaps: true,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                hoverPointBackgroundColor: 'transparent',
                hoverPointBorderColor: 'transparent'
			}]
		},
		options: {
			scales: {
				yAxes: [{
					ticks: {
						//beginAtZero: true
					}
				}],
				xAxes: [{
					ticks: {
						display: false
					}
				}]
			},

			elements: {
				line: {
					tension: 0.5
				},
                point:{
                    radius: 30,
                    hoverRadius: 30
                }
			},

			legend: {
				display: false
			},

            maintainAspectRatio: false
		}
	};
}

/* END DASHBOARD */

/* PAGINATION */

$(document).ready(function() {
	$(document).on('click', '#pagination_admin_users .pagination-item', function() {
		var page = $(this).attr('data-page');
		var order = parseInt($('#admin_users_order').val());
		var search = $('#admin_users_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_users',
			'page': page,
			'order': order,
			'search': search
		});
	});

	$(document).on('change', '#admin_users_order', function() {
		var order = parseInt($('#admin_users_order').val());
		var search = $('#admin_users_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_users',
			'page': 1,
			'order': order,
			'search': search
		});
	});

	var timeout_admin_users = null;
	$('#admin_users_search').on('input', function() {
		if(timeout_admin_users) clearTimeout(timeout_admin_users);

		timeout_admin_users = setTimeout(function(){
			var order = parseInt($('#admin_users_order').val());
			var search = $('#admin_users_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'admin_users',
				'page': 1,
				'order': order,
				'search': search
			});
		}, 1000);
	});

    $(document).on('click', '#pagination_admin_crypto_confirmations .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_crypto_confirmations',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_transactions .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_transactions',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_deposits .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_deposits',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_withdrawals .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_withdrawals',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_crash_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_crash_history',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_coinflip_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_coinflip_history',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_blackjack_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_blackjack_history',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_tower_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_tower_history',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_minesweeper_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_minesweeper_history',
			'page': page
		});
	});

    $(document).on('click', '#pagination_account_casino_history .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'account_casino_history',
			'page': page
		});
	});

	$(document).on('click', '#pagination_user_transactions .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_transactions',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_deposits .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_deposits',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_withdrawals .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_withdrawals',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_crash_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_crash_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_coinflip_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_coinflip_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_blackjack_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_blackjack_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_tower_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_tower_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_minesweeper_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_minesweeper_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

    $(document).on('click', '#pagination_user_casino_history .pagination-item', function() {
		if(app.paths[1] === undefined) return;

        var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'user_casino_history',
			'page': page,
            'userid': app.paths[1]
		});
	});

	$(document).on('click', '#pagination_affiliates_referrals .pagination-item', function() {
		var page = $(this).attr('data-page');

		send_request_socket({
			'type': 'pagination',
			'command': 'affiliates_referrals',
			'page': page
		});
	});

	$(document).on('click', '#pagination_admin_tracking_links .pagination-item', function() {
		var page = $(this).attr('data-page');
		var search = $('#admin_tracking_links_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_tracking_links',
			'page': page,
			'search': search
		});
	});

	var timeout_admin_tracking_links = null;
	$('#admin_tracking_links_search').on('input', function() {
		if(timeout_admin_tracking_links) clearTimeout(timeout_admin_tracking_links);

		timeout_admin_tracking_links = setTimeout(function(){
			var search = $('#admin_tracking_links_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'admin_tracking_links',
				'page': 1,
				'search': search
			});
		}, 1000);
	});

	$(document).on('click', '#pagination_admin_deposit_bonuses .pagination-item', function() {
		var page = $(this).attr('data-page');
		var search = $('#admin_deposit_bonuses_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_deposit_bonuses',
			'page': page,
			'search': search
		});
	});

	var timeout_admin_deposit_bonuses = null;
	$('#admin_deposit_bonuses_search').on('input', function() {
		if(timeout_admin_deposit_bonuses) clearTimeout(timeout_admin_deposit_bonuses);

		timeout_admin_deposit_bonuses = setTimeout(function(){
			var search = $('#admin_deposit_bonuses_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'admin_deposit_bonuses',
				'page': 1,
				'search': search
			});
		}, 1000);
	});

    $(document).on('click', '#pagination_admin_gamebots .pagination-item', function() {
		var page = $(this).attr('data-page');
		var order = parseInt($('#admin_gamebots_order').val());
		var search = $('#admin_gamebots_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_gamebots',
			'page': page,
			'order': order,
			'search': search
		});
	});

	$(document).on('change', '#admin_gamebots_order', function() {
		var order = parseInt($('#admin_gamebots_order').val());
		var search = $('#admin_gamebots_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_gamebots',
			'page': 1,
			'order': order,
			'search': search
		});
	});

	var timeout_admin_users = null;
	$('#admin_gamebots_search').on('input', function() {
		if(timeout_admin_users) clearTimeout(timeout_admin_users);

		timeout_admin_users = setTimeout(function(){
			var order = parseInt($('#admin_gamebots_order').val());
			var search = $('#admin_gamebots_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'admin_gamebots',
				'page': 1,
				'order': order,
				'search': search
			});
		}, 1000);
	});

    $(document).on('click', '#pagination_support_requests .pagination-item', function() {
		var page = $(this).attr('data-page');

		var search = $('#support_search').val();
		var status = parseInt($('#support_filter_status').val());

		send_request_socket({
			'type': 'pagination',
			'command': 'support_requests',
			'page': page,
			'status': status,
			'search': search
		});
	});

	$(document).on('change', '#support_filter_status', function() {
		var search = $('#support_search').val();
		var status = parseInt($('#support_filter_status').val());

		send_request_socket({
			'type': 'pagination',
			'command': 'support_requests',
			'page': 1,
			'status': status,
			'search': search
		});
	});

	var timeout_support_requests = null;
	$('#support_search').on('input', function() {
		if(timeout_support_requests) clearTimeout(timeout_support_requests);

		timeout_support_requests = setTimeout(function(){
			var search = $('#support_search').val();
			var status = parseInt($('#support_filter_status').val());

			send_request_socket({
				'type': 'pagination',
				'command': 'support_requests',
				'page': 1,
				'status': status,
				'search': search
			});
		}, 1000);
	});

    $(document).on('click', '#pagination_admin_support_requests .pagination-item', function() {
		var page = $(this).attr('data-page');

		var search = $('#admin_support_search').val();
		var status = parseInt($('#admin_support_filter_status').val());
		var department = parseInt($('#admin_support_filter_department').val());

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_support_requests',
			'page': page,
			'status': status,
			'department': department,
			'search': search
		});
	});

	$(document).on('change', '#admin_support_filter_status', function() {
		var search = $('#admin_support_search').val();
		var status = parseInt($('#admin_support_filter_status').val());
		var department = parseInt($('#admin_support_filter_department').val());

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_support_requests',
			'page': 1,
			'status': status,
			'department': department,
			'search': search
		});
	});

	$(document).on('change', '#admin_support_filter_department', function() {
		var search = $('#admin_support_search').val();
		var status = parseInt($('#admin_support_filter_status').val());
		var department = parseInt($('#admin_support_filter_department').val());

		send_request_socket({
			'type': 'pagination',
			'command': 'admin_support_requests',
			'page': 1,
			'status': status,
			'department': department,
			'search': search
		});
	});

	var timeout_admin_support_requests = null;
	$('#admin_support_search').on('input', function() {
		if(timeout_admin_support_requests) clearTimeout(timeout_admin_support_requests);

		timeout_admin_support_requests = setTimeout(function(){
			var search = $('#admin_support_search').val();
            var status = parseInt($('#admin_support_filter_status').val());
            var department = parseInt($('#admin_support_filter_department').val());

			send_request_socket({
				'type': 'pagination',
				'command': 'admin_support_requests',
				'page': 1,
				'status': status,
				'department': department,
				'search': search
			});
		}, 1000);
	});
});

function pagination_addUsers(list){
	if(list.length > 0) {
		$('#admin_users_list').empty();

		list.forEach(function(item){
			var rank_name = { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[item.rank];

			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left">';
					DIV += '<div class="flex items-center gap-1">';
						DIV += createAvatarField(item.user, 'small', '', '');

						DIV += '<div class="text-left w-full truncate">' + item.user.name + '</div>';
					DIV += '</div>';
				DIV += '</div>';

				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.user.userid + '">' + item.user.userid + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.balance) + '$</div>';
				DIV += '<div class="table-column text-left font-bold chat-link-' + rank_name + '">' + rank_name.toUpperCase() + '</div>';
				DIV += '<div class="table-column text-left">' + item.time_create + '</div>';

				DIV += '<div class="table-column text-right"><a href="/admin/users/' + item.user.userid + '"><button class="button button-primary shadow-2">Moderate</button></a></div>';
			DIV += '</div>';

			$('#admin_users_list').append(DIV);
		});
	} else {
		$('#admin_users_list').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addCryptoConfirmations(list){
	if(list.length > 0) {
		$('#admin_crypto_confirmations').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.userid + '">' + item.userid + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left uppercase">' + item.currency + '</div>';
				DIV += '<div class="table-column text-left">' + item.time + '</div>';

				DIV += '<div class="table-column full text-right">';
					DIV += '<div class="flex responsive flex-row justify-end gap-1">';
						DIV += '<button class="button button-primary shadow-2 admin_trades_confirm" data-method="crypto" data-trade="' + item.id + '">Confirm</button>';
						DIV += '<button class="button button-primary shadow-2 admin_trades_cancel" data-method="crypto" data-trade="' + item.id + '">Cancel</button>';
					DIV += '</div>';
				DIV += '</div>';
			DIV += '</div>';

			$('#admin_crypto_confirmations').append(DIV);
		});
	} else {
		$('#admin_crypto_confirmations').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addTrackingLinks(list){
	if(list.length > 0) {
		$('#admin_tracking_links').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.referral + '">' + item.referral + '</div>';
				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.userid + '">' + item.userid + '</div>';
				DIV += '<div class="table-column text-left">' + item.usage + '</div>';

				DIV += '<div class="table-column full text-right">';
					DIV += '<div class="flex responsive flex-row justify-end gap-1">';
						DIV += '<button class="button button-primary shadow-2" data-copy="text" data-text="' + item.link + '">Copy link</button>';
						DIV += '<button class="button button-primary shadow-2 admin_tracking_joins_dashboard" data-id="' + item.id + '">Dashboard</button>';
						DIV += '<button class="button button-danger shadow-2 admin_tracking_links_remove" data-id="' + item.id + '">Remove</button>';
					DIV += '</div>';
				DIV += '</div>';
			DIV += '</div>';

			$('#admin_tracking_links').append(DIV);
		});
	} else {
		$('#admin_tracking_links').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addDepositBonuses(list){
	if(list.length > 0) {
		$('#admin_deposit_bonuses').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.code.toUpperCase() + '">' + item.code.toUpperCase() + '</div>';
				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.referral + '">' + item.referral + '</div>';
				DIV += '<div class="table-column text-left">' + item.uses + '</div>';
				DIV += '<div class="table-column text-left">' + roundedToFixed(item.amount, 5).toFixed(5) + '</div>';

				DIV += '<div class="table-column full text-right">';
					DIV += '<button class="button button-primary shadow-2 admin_deposit_bonuses_remove" data-id="' + item.id + '">Remove</button>';
				DIV += '</div>';
			DIV += '</div>';

			$('#admin_deposit_bonuses').append(DIV);
		});
	} else {
		$('#admin_deposit_bonuses').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountTransactions(list){
	if(list.length > 0) {
		$('#account_transactions').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row text-' + (item.amount < 0 ? "danger" : "success") + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.service.split('_').join(' ') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_transactions').append(DIV);
		});
	} else {
		$('#account_transactions').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountDeposits(list){
	if(list.length > 0) {
		$('#account_deposits').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { completed: 'text-success', declined: 'text-danger', pending: 'text-warning', partially_paid: 'text-warning', clearing: 'text-warning' }[item.status] + '">';
				DIV += '<div class="table-column text-left">' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.paid) + '</div>';
				DIV += '<div class="table-column text-left">' + item.method + '</div>';
				DIV += '<div class="table-column text-left">' + { completed: 'Completed', declined: 'Declined', pending: 'Pending', partially_paid: 'Partially Paid', clearing: 'Clearing' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_deposits').append(DIV);
		});
	} else {
		$('#account_deposits').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountWithdrawals(list){
	if(list.length > 0) {
		$('#account_withdrawals').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { completed: 'text-success', declined: 'text-danger', pending: 'text-warning', clearing: 'text-warning' }[item.status] + '">';
				DIV += '<div class="table-column text-left">' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + item.method + '</div>';
				DIV += '<div class="table-column text-left">' + { completed: 'Completed', declined: 'Declined', pending: 'Pending', clearing: 'Clearing' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_withdrawals').append(DIV);
		});
	} else {
		$('#account_withdrawals').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountCrashHistory(list){
	if(list.length > 0) {
		$('#account_crash_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + roundedToFixed(item.multiplier, 2).toFixed(2) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_crash_history').append(DIV);
		});
	} else {
		$('#account_crash_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountCoinflipHistory(list){
	if(list.length > 0) {
		$('#account_coinflip_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + { win: 'Win', loss: 'Loss' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_coinflip_history').append(DIV);
		});
	} else {
		$('#account_coinflip_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountBlackjackHistory(list){
	if(list.length > 0) {
		$('#account_blackjack_history').empty();

		list.forEach(function(item){
			var statusClass = { win: 'text-success', loss: 'text-danger', push: 'text-muted-foreground', blackjack: 'text-success' }[item.status] || '';
			var DIV = '<div class="table-row ' + statusClass + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + (item.result || '-') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_blackjack_history').append(DIV);
		});
	} else {
		$('#account_blackjack_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountTowerHistory(list){
	if(list.length > 0) {
		$('#account_tower_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.difficulty + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_tower_history').append(DIV);
		});
	} else {
		$('#account_tower_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountMinesweeperHistory(list){
	if(list.length > 0) {
		$('#account_minesweeper_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + item.bombs + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_minesweeper_history').append(DIV);
		});
	} else {
		$('#account_minesweeper_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAccountCasinoHistory(list){
	if(list.length > 0) {
		$('#account_casino_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.game.split('_').join(' ') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#account_casino_history').append(DIV);
		});
	} else {
		$('#account_casino_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserTransactions(list){
	if(list.length > 0) {
		$('#user_transactions').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row text-' + (item.amount < 0 ? "danger" : "success") + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.service.split('_').join(' ') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_transactions').append(DIV);
		});
	} else {
		$('#user_transactions').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserDeposits(list){
	if(list.length > 0) {
		$('#user_deposits').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { completed: 'text-success', declined: 'text-danger', pending: 'text-warning', partially_paid: 'text-warning', clearing: 'text-warning' }[item.status] + '">';
				DIV += '<div class="table-column text-left">' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.paid) + '</div>';
				DIV += '<div class="table-column text-left">' + item.method + '</div>';
				DIV += '<div class="table-column text-left">' + { completed: 'Completed', declined: 'Declined', pending: 'Pending', partially_paid: 'Partially Paid', clearing: 'Clearing' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_deposits').append(DIV);
		});
	} else {
		$('#user_deposits').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserWithdrawals(list){
	if(list.length > 0) {
		$('#user_withdrawals').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { completed: 'text-success', declined: 'text-danger', pending: 'text-warning', clearing: 'text-warning' }[item.status] + '">';
				DIV += '<div class="table-column text-left">' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + item.method + '</div>';
				DIV += '<div class="table-column text-left">' + { completed: 'Completed', declined: 'Declined', pending: 'Pending', clearing: 'Clearing' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_withdrawals').append(DIV);
		});
	} else {
		$('#user_withdrawals').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserCrashHistory(list){
	if(list.length > 0) {
		$('#user_crash_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + roundedToFixed(item.multiplier, 2).toFixed(2) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_crash_history').append(DIV);
		});
	} else {
		$('#user_crash_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserCoinflipHistory(list){
	if(list.length > 0) {
		$('#user_coinflip_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + { win: 'Win', loss: 'Loss' }[item.status] + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_coinflip_history').append(DIV);
		});
	} else {
		$('#user_coinflip_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserBlackjackHistory(list){
	if(list.length > 0) {
		$('#user_blackjack_history').empty();

		list.forEach(function(item){
			var statusClass = { win: 'text-success', loss: 'text-danger', push: 'text-muted-foreground', blackjack: 'text-success' }[item.status] || '';
			var DIV = '<div class="table-row ' + statusClass + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + (item.result || '-') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_blackjack_history').append(DIV);
		});
	} else {
		$('#user_blackjack_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserTowerHistory(list){
	if(list.length > 0) {
		$('#user_tower_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.difficulty + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_tower_history').append(DIV);
		});
	} else {
		$('#user_tower_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserMinesweeperHistory(list){
	if(list.length > 0) {
		$('#user_minesweeper_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left">' + item.bombs + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_minesweeper_history').append(DIV);
		});
	} else {
		$('#user_minesweeper_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addUserCasinoHistory(list){
	if(list.length > 0) {
		$('#user_casino_history').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row ' + { win: 'text-success', loss: 'text-danger' }[item.status] + '">';
				DIV += '<div class="table-column text-left">#' + item.id + '</div>';
				DIV += '<div class="table-column text-left capitalize">' + item.game.split('_').join(' ') + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.amount) + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.profit) + '</div>';
				DIV += '<div class="table-column text-left">' + item.date + '</div>';
			DIV += '</div>';

			$('#user_casino_history').append(DIV);
		});
	} else {
		$('#user_casino_history').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addAffiliatesReferrals(list){
	if(list.length > 0) {
		$('#affiliates_referrals').empty();

		list.forEach(function(item){
			var DIV = ' <div class="table-row">';
				DIV += '<div class="table-column text-left">' + item.userid + '</div>';
				DIV += '<div class="table-column text-left">' + item.wagered.toFixed(5) + '</div>';
				DIV += '<div class="table-column text-left">' + item.deposited.toFixed(5) + '</div>';
				DIV += '<div class="table-column text-left">' + item.commissions.wagered.toFixed(5) + '</div>';
				DIV += '<div class="table-column text-left">' + item.commissions.deposited.toFixed(5) + '</div>';
				DIV += '<div class="table-column text-left">' + item.commissions.total.toFixed(5) + '</div>';
			DIV += '</div>';

			$('#affiliates_referrals').append(DIV);
		});
	} else {
		$('#affiliates_referrals').html(emptyTable({
			title: 'No data found'
		}));
	}
}

function pagination_addGamebots(list){
	if(list.length > 0) {
		$('#admin_gamebots_list').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left">';
					DIV += '<div class="flex items-center gap-1">';
						DIV += createAvatarField(item.user, 'small', '', '');

						DIV += '<div class="text-left w-full truncate">' + item.user.name + '</div>';
					DIV += '</div>';
				DIV += '</div>';

				DIV += '<div class="table-column text-left pointer" data-copy="text" data-text="' + item.user.userid + '">' + item.user.userid + '</div>';
				DIV += '<div class="table-column text-left">' + getFormatAmountString(item.balance) + '$</div>';

				DIV += '<div class="table-column text-right"><button class="button button-primary shadow-2 admin_gamebot_moderate" data-userid="' + item.user.userid + '">Moderate</button></div>';
			DIV += '</div>';

			$('#admin_gamebots_list').append(DIV);
		});
	} else {
		$('#admin_gamebots_list').html(emptyTable({
			title: 'No data found'
		}));
	}
}

/* END PAGINATION */

/* ADMIN PANEL */

var admin_lastSetting = null;

$(document).ready(function() {
	$(document).on('click', '#admin_maintenance_set', function() {
		var status = parseInt($('#admin_maintenance_status').val()) == 1;
		var reason = $('#admin_maintenance_reason').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'maintenance',
				'status': status,
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_dropdown_settings', function() {
		var settings = $(this).attr('data-settings');
		var status = parseInt($('.admin_control_settings[data-settings="' + settings + '"]').val()) == 1;

		confirm_action(function(confirmed){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'settings',
				'settings': settings,
				'status': status
			});
		});
	});

	$(document).on('change', '.admin_switch_settings', function() {
		var settings = $(this).attr('data-settings');
		var status = $(this).is(':checked');

		if(status) $(this).removeAttr('checked');
		else $(this).attr('checked', 'checked');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'settings',
				'settings': settings,
				'status': status,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_user_remove_bind', function() {
		var bind = $(this).attr('data-bind');

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'remove_bind',
				'userid': app.paths[2],
				'bind': bind,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_remove_exclusion', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'remove_exclusion',
				'userid': app.paths[2],
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_remove_sessions', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'remove_sessions',
				'userid': app.paths[2],
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_ip_ban', function() {
		var ip = $('#admin_user_ip_value').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'ban_ip',
				'userid': app.paths[2],
				'ip': ip,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_ip_unban', function() {
		var ip = $('#admin_user_ip_value').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'unban_ip',
				'userid': app.paths[2],
				'ip': ip,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_rank_set', function() {
		var rank = parseInt($('#admin_user_rank_value').val());

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_rank',
				'userid': app.paths[2],
				'rank': rank,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_balance_edit', function() {
		var amount = $('#admin_user_balance_amount').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'edit_balance',
				'userid': app.paths[2],
				'amount': amount,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_site_set', function() {
		var reason = $('#admin_user_restriction_site_reason').val();
		var amount = $('#admin_user_restriction_site_amount').val().toString();
		var date = $('#admin_user_restriction_site_date').val().toString();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'site',
				'time': amount + date,
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_site_permanently', function() {
		var reason = $('#admin_user_restriction_site_reason').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'site',
				'time': 'permanent',
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_site_unset', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'unset_restriction',
				'userid': app.paths[2],
				'restriction': 'site',
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_user_restriction_play_set', function() {
		var reason = $('#admin_user_restriction_play_reason').val();
		var amount = $('#admin_user_restriction_play_amount').val().toString();
		var date = $('#admin_user_restriction_play_date').val().toString();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'play',
				'time': amount + date,
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_play_permanently', function() {
		var reason = $('#admin_user_restriction_play_reason').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'play',
				'time': 'permanent',
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_play_unset', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'unset_restriction',
				'userid': app.paths[2],
				'restriction': 'play',
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_user_restriction_trade_set', function() {
		var reason = $('#admin_user_restriction_trade_reason').val();
		var amount = $('#admin_user_restriction_trade_amount').val().toString();
		var date = $('#admin_user_restriction_trade_date').val().toString();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'trade',
				'time': amount + date,
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_trade_permanently', function() {
		var reason = $('#admin_user_restriction_trade_reason').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'trade',
				'time': 'permanent',
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_trade_unset', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'unset_restriction',
				'userid': app.paths[2],
				'restriction': 'trade',
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_user_restriction_mute_set', function() {
		var reason = $('#admin_user_restriction_mute_reason').val();
		var amount = $('#admin_user_restriction_mute_amount').val().toString();
		var date = $('#admin_user_restriction_mute_date').val().toString();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'mute',
				'time': amount + date,
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_mute_permanently', function() {
		var reason = $('#admin_user_restriction_mute_reason').val();

		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'set_restriction',
				'userid': app.paths[2],
				'restriction': 'mute',
				'time': 'permanent',
				'reason': reason,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_user_restriction_mute_unset', function() {
		if(app.paths[2] === undefined) return;

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'unset_restriction',
				'userid': app.paths[2],
				'restriction': 'mute',
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_admin_access_set', function() {
		var userid = $('#admin_admin_access_userid').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'admin_access_set',
				'userid': userid,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_admin_access_unset', function() {
		var userid = $('#admin_admin_access_userid').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'admin_access_unset',
				'userid': userid,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_dashboard_access_set', function() {
		var userid = $('#admin_dashboard_access_userid').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'dashboard_access_set',
				'userid': userid,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_dashboard_access_unset', function() {
		var userid = $('#admin_dashboard_access_userid').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'dashboard_access_unset',
				'userid': userid,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_tracking_links_create', function() {
		var expire = $('#admin_tracking_links_expire').val();
		var usage = $('#admin_tracking_links_usage').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'tracking_links_create',
				'expire': expire,
				'usage': usage,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_tracking_links_remove', function() {
		var id = $(this).attr('data-id');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'tracking_links_remove',
				'id': id,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_tracking_joins_dashboard', function() {
		var id = $(this).attr('data-id');

		var $dashboard = $('#modal_tracking_joins_dashboard .dashboard-chart');

		$dashboard.attr('data-id', id);

		$('#modal_tracking_joins_dashboard').modal('show');
	});

    $(document).on('show', '#modal_tracking_joins_dashboard', function() {
        var $dashboard = $('#modal_tracking_joins_dashboard .dashboard-chart');

		dashboard_loadGraph({ date: $dashboard.find('.dashboard-graph').val(), graph: $dashboard.attr('data-graph') + '.' + $dashboard.attr('data-id') });
    });

	$(document).on('click', '#admin_deposit_bonuses_create', function() {
		var referral = $('#admin_deposit_bonuses_referral').val();
		var code = $('#admin_deposit_bonuses_code').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'deposit_bonuses_create',
				'referral': referral,
				'code': code,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_deposit_bonuses_remove', function() {
		var id = $(this).attr('data-id');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'deposit_bonuses_remove',
				'id': id,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_games_house_edge_set', function() {
		var house_edges = [
            { game: 'crash', value: $('#admin_games_house_edge_crash_value').val() },
            { game: 'coinflip', value: $('#admin_games_house_edge_coinflip_value').val() },
            { game: 'blackjack', value: $('#admin_games_house_edge_blackjack_value').val() },
            { game: 'minesweeper', value: $('#admin_games_house_edge_minesweeper_value').val() },
            { game: 'tower', value: $('#admin_games_house_edge_tower_value').val() }
        ];

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'games_house_edges',
				'house_edges': house_edges,
				'secret': secret
			});
		});
	});

    $(document).on('click', '.admin_trades_confirm', function() {
		var method = $(this).attr('data-method');
		var trade = $(this).attr('data-trade');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'payment_confirm',
				'method': method,
				'trade': trade,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_trades_cancel', function() {
		var method = $(this).attr('data-method');
		var trade = $(this).attr('data-trade');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'payment_cancel',
				'method': method,
				'trade': trade,
				'secret': secret
			});
		});
	});

	$(document).on('click', '#admin_payments_manually_amount_set', function() {
		var amount = $('#admin_payments_manually_amount_value').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'payments_manually_amount',
				'amount': amount,
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_gamebots_create', function() {
		var name = $('#admin_gamebots_name').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'gamebots_create',
				'name': name,
				'secret': secret
			});
		});
	});

	$(document).on('click', '.admin_gamebot_moderate', function() {
		var userid = $(this).attr('data-userid');

		$('#admin_gamebots_balance_edit').attr('data-userid', userid);

		$('#modal_gamebots_moderate').modal('show');
	});

	$(document).on('click', '#admin_gamebots_balance_edit', function() {
		var amount = $('#admin_gamebots_balance_amount').val();
		var userid = $(this).attr('data-userid');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'edit_balance',
				'userid': userid,
				'amount': amount,
				'secret': secret
			});
		});
	});

    // ADMIN SUPPORT
	$(document).on('click', '#admin_support_claim', function() {
		var id = $(this).attr('data-id');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'support_claim',
				'id': id,
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_support_release', function() {
		var id = $(this).attr('data-id');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'support_release',
				'id': id,
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_support_change_department', function() {
		var id = $(this).attr('data-id');
        var department = $('#admin_support_department').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'support_change_department',
				'id': id,
				'department': department,
				'secret': secret
			});
		});
	});

    $(document).on('click', '#admin_support_reply', function() {
		var id = $(this).attr('data-id');
        var message = $('#admin_support_reply_message').val();

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'support_reply',
				'id': id,
				'message': message,
				'secret': secret
			});

            $('#admin_support_reply_message').val('');

            changeInputFieldLabel($('#admin_support_reply_message').closest('.input_field'));
            clearInputFieldError($('#admin_support_reply_message').closest('.input_field'));
		});
	});

    $(document).on('click', '#admin_support_close', function() {
		var id = $(this).attr('data-id');

		confirm_identity(function(confirmed, secret){
			if(!confirmed) return;

			send_request_socket({
				'type': 'admin',
				'command': 'support_close',
				'id': id,
				'secret': secret
			});
		});
	});
});

function confirm_action(callback){
	$('#modal_confirm_action').modal('show');

	$(document).off('click', '#confirm_action_no');
	$(document).off('click', '#confirm_action_yes');

	$(document).on('click', '#confirm_action_no', function() { return callback(false); });

	$(document).on('click', '#confirm_action_yes', function() { return callback(true); });
}

function confirm_identity(callback){
	$('#modal_confirm_identity').modal('show');

	$(document).off('click', '#confirm_identity_no');
	$(document).off('click', '#confirm_identity_yes');

	$(document).on('click', '#confirm_identity_no', function() { return callback(false); });

	$(document).on('click', '#confirm_identity_yes', function() {
		var secret = $('#confirm_identity_secret').val();

		return callback(true, secret);
	});
}

function admin_supportAddReply(reply){
    var DIV = '<div class="flex flex-col gap-2">';
        DIV += '<div class="flex justify-between items-center gap-2 px-2">';
            DIV += '<div class="flex items-center gap-1 overflow-hidden">';
                DIV += createAvatarField(reply.user, 'small', '', '');

                DIV += '<div class="flex flex-col text-left overflow-hidden">';
                    DIV += '<div class="text-base truncate">' + reply.user.name + '</div>';

                    if(reply.response) {
                        DIV += '<div class="text-success text-xs">Support Staff</div>';
                    } else {
                        DIV += '<div class="text-danger text-xs">He</div>';
                    }
                DIV += '</div>';
            DIV += '</div>';

            DIV += '<div class="text-muted-foreground text-xs">' + reply.date + '</div>';
        DIV += '</div>';

        if(reply.response) {
            DIV += '<div class="message response bg-card p-4 text-left ml-6">';
                DIV += '<div class="flex flex-col gap-4 text-left mt-2">';
                    DIV += '<div class="text-muted-foreground">Greetings ' + reply.requester + ',</div>';

                    DIV += '<div>' + reply.message + '</div>';

                    DIV += '<div class="text-muted-foreground">';
                        DIV += '<div>All the best,</div>';
                        DIV += '<div>' + reply.user.name + '</div>';
                    DIV += '</div>';
                DIV += '</div>';
            DIV += '</div>';
        } else {
            DIV += '<div class="message bg-card p-4 text-left ml-6">' + reply.message + '</div>';
        }
    DIV += '</div>';

    $('#admin_support_messages').append(DIV);
}

function admin_supportSetStatus(closed, status){
    $('#admin_support_request_status').removeClass('bg-danger bg-opacity-50').removeClass('bg-warning bg-opacity-50').removeClass('bg-success bg-opacity-50').removeClass('bg-info bg-opacity-50');

    $('#admin_support_request_status').addClass([ { 0: 'bg-danger bg-opacity-50', 1: 'bg-warning bg-opacity-50', 2: 'bg-success bg-opacity-50' }[status], 'bg-info bg-opacity-50' ][closed]);
    $('#admin_support_request_status').text([ { 0: 'Opened', 1: 'Unsolved', 2: 'Answered' }[status], 'Solved' ][closed]);
}

function pagination_addAdminSupportRequests(list){
	if(list.length > 0) {
		$('#admin_support_requests').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left"><a class="underline" href="/admin/support/requests/' + item.id + '">' + item.subject + '</a></div>';
				DIV += '<div class="table-column text-left">' + { 0: 'General / Others', 1: 'Bug report', 2: 'Trade offer issue', 3: 'Improvements / Ideas', 4: 'Marketing / Partnership', 5: 'Ranking up' }[item.department] + '</div>';
				DIV += '<div class="table-column text-left">' + item.created + '</div>';
				DIV += '<div class="table-column text-left">' + item.updated + '</div>';
				DIV += '<div class="table-column text-left">';
					if(item.assigned){
						DIV += '<div class="flex items-center gap-1">';
							DIV += createAvatarField(item.assigned, 'small', '', '');
							DIV += '<div class="text-left w-full truncate">' + item.assigned.name + '</div>';
						DIV += '</div>';
					} else if(item.closed) DIV += '<div class="font-bold text-danger">Unavailable</div>';
					else DIV += '<div class="font-bold text-success">Available</div>';
				DIV += '</div>';
				DIV += '<div class="table-column"><div class="flex flex-row justify-end"><div class="' + [ { 0: 'bg-danger bg-opacity-50', 1: 'bg-warning bg-opacity-50', 2: 'bg-success bg-opacity-50' }[item.status], 'bg-info bg-opacity-50' ][item.closed] + ' p-1 rounded-1">' + [ { 0: 'Opened', 1: 'Unsolved', 2: 'Answered' }[item.status], 'Solved' ][item.closed] + '</div></div></div>';
			DIV += '</div>';

			$('#admin_support_requests').append(DIV);
		});
	} else {
		$('#admin_support_requests').html(emptyTable({
			title: 'No requests found'
		}));
	}
}

/* END ADMIN PANEL */

/* HISTORY */

$(document).ready(function() {
	//app.page == 'home'
    if(profile_settingsGet('history') == 'game_bets' && app.page == '') {
		profile_settingsChange('history', 'all_bets');

		$('.bet-select .history-load').removeClass('active');
		$('.bet-select .history-load[data-type="all_bets"]').addClass('active');
	}

	$(document).on('click', '.history-load', function() {
		var history = $(this).attr('data-type');
		var game = app.paths[0];

		profile_settingsChange('history', history);

		$('.bet-select .history-load').removeClass('active');
		$('.bet-select .history-load[data-type="' + history + '"]').addClass('active');

		send_request_socket({
			'type': 'history',
			'command': 'get',
			'history': history,
			'game': game
		});
	});
});

function history_addHistory(history){
	$('#history_list > :not(.table-row)').remove();

	$('#history_list').prepend(liveHistory({
		...history,
		...{
			amount: getFormatAmountString(history.amount),
			multiplier: history.multiplier.toFixed(2),
			winning: getFormatAmountString(history.winning)
		}
	}));

	$('#history_list > .table-row:first-child').slideUp(0).slideDown('fast');

	while($('#history_list > .table-row').length > 10) $('#history_list > .table-row').last().remove();
}

/* END HISTORY */

/* FAIR */

$(document).ready(function() {
	$(document).on('click', '#save_clientseed', function() {
		var client_seed = $('#client_seed').val();

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'fair',
				'command': 'save_clientseed',
				'seed': client_seed,
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#regenerate_serverseed', function() {
		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'fair',
				'command': 'regenerate_serverseed',
				'recaptcha': render
			});
		});
	});
});

/* END FAIR */

/* SUPPORT */

$(document).ready(function() {
	$(document).on('click', '#support_create', function() {
		var subject = $('#support_subject').val();
		var department = $('#support_department').val();
		var message = $('#support_message').val();

		send_request_socket({
            'type': 'support',
            'command': 'create',
            'subject': subject,
            'department': department,
            'message': message
        });
	});

    $(document).on('click', '#support_reply', function() {
		var id = $(this).attr('data-id');
		var message = $('#support_reply_message').val();

		send_request_socket({
            'type': 'support',
            'command': 'reply',
            'id': id,
            'message': message
        });

        $('#support_reply_message').val('');

        changeInputFieldLabel($('#support_reply_message').closest('.input_field'));
        clearInputFieldError($('#support_reply_message').closest('.input_field'));
	});

    $(document).on('click', '#support_close', function() {
		var id = $(this).attr('data-id');

		send_request_socket({
            'type': 'support',
            'command': 'close',
            'id': id
        });
	});
});

function support_addReply(reply){
    var DIV = '<div class="flex flex-col gap-2">';
        DIV += '<div class="flex justify-between items-center gap-2 px-2">';
            DIV += '<div class="flex items-center gap-1 overflow-hidden">';
                DIV += createAvatarField(reply.user, 'small', '', '');

                DIV += '<div class="flex flex-col text-left overflow-hidden">';
                    DIV += '<div class="text-base truncate">' + reply.user.name + '</div>';

                    if(reply.response) {
                        DIV += '<div class="text-success text-xs">Support Staff</div>';
                    } else {
                        DIV += '<div class="text-danger text-xs">Me</div>';
                    }
                DIV += '</div>';
            DIV += '</div>';

            DIV += '<div class="text-muted-foreground text-xs">' + reply.date + '</div>';
        DIV += '</div>';

        if(reply.response) {
            DIV += '<div class="message response bg-card p-4 text-left ml-6">';
                DIV += '<div class="flex flex-col gap-4 text-left mt-2">';
                    DIV += '<div class="text-muted-foreground">Greetings ' + reply.requester + ',</div>';

                    DIV += '<div>' + reply.message + '</div>';

                    DIV += '<div class="text-muted-foreground">';
                        DIV += '<div>All the best,</div>';
                        DIV += '<div>' + reply.user.name + '</div>';
                    DIV += '</div>';
                DIV += '</div>';
            DIV += '</div>';
        } else {
            DIV += '<div class="message bg-card p-4 text-left ml-6">' + reply.message + '</div>';
        }
    DIV += '</div>';

    $('#support_messages').append(DIV);
}

function support_setStatus(closed, status){
    $('#support_request_status').removeClass('bg-success bg-opacity-50').removeClass('bg-warning bg-opacity-50').removeClass('bg-info bg-opacity-50');

    $('#support_request_status').addClass([ { 0: 'bg-success bg-opacity-50', 1: 'bg-success bg-opacity-50', 2: 'bg-warning bg-opacity-50' }[status], 'bg-info bg-opacity-50' ][closed]);
    $('#support_request_status').text([ { 0: 'Opened', 1: 'Opened', 2: 'Awaiting your reply' }[status], 'Solved' ][closed]);
}

function pagination_addSupportRequests(list){
	if(list.length > 0) {
		$('#support_requests').empty();

		list.forEach(function(item){
			var DIV = '<div class="table-row">';
				DIV += '<div class="table-column text-left"><a class="underline" href="/support/requests/' + item.id + '">' + item.subject + '</a></div>';
				DIV += '<div class="table-column text-left">' + { 0: 'General / Others', 1: 'Bug report', 2: 'Trade offer issue', 3: 'Improvements / Ideas', 4: 'Marketing / Partnership', 5: 'Ranking up' }[item.department] + '</div>';
				DIV += '<div class="table-column text-left">' + item.created + '</div>';
				DIV += '<div class="table-column text-left">' + item.updated + '</div>';
				DIV += '<div class="table-column"><div class="flex flex-row justify-end"><div class="' + [ { 0: 'bg-success bg-opacity-50', 1: 'bg-success bg-opacity-50', 2: 'bg-warning bg-opacity-50' }[item.status], 'bg-info bg-opacity-50' ][item.closed] + ' p-1 rounded-1">' + [ { 0: 'Opened', 1: 'Opened', 2: 'Awaiting your reply' }[item.status], 'Solved' ][item.closed] + '</div></div></div>';
			DIV += '</div>';

			$('#support_requests').append(DIV);
		});
	} else {
		$('#support_requests').html(emptyTable({
			title: 'No requests found'
		}));
	}
}

/* END SUPPORT */

/* CHAT */

var chat_ignoreList = [];
var chat_isPaused = false;
var chat_maxMessages = 40;

var chat_replyMessage = null;
var chat_rainInterval = null;

var timeFormats = [
	{time: 1, time_format: 1, ago: 'seconds ago', next: 'seconds from now', count: true},
	{time: 60, time_format: 60, ago: 'minute ago', next: 'minute from now', count: true},
	{time: 120, time_format: 60, ago: 'minutes ago', next: 'minutes from now', count: true},
	{time: 3600, time_format: 3600, ago: 'hour ago', next: 'hour from now', count: true},
	{time: 7200, time_format: 3600, ago: 'hours ago', next: 'hours from now', count: true},
	{time: 86400, time_format: 86400, ago: 'Yesterday', next: 'Tomorrow', count: false},
	{time: 172800, time_format: 86400, ago: 'days ago', next: 'days from now', count: true},
	{time: 604800, time_format: 604800, ago: 'Last week', next: 'Next week', count: false},
	{time: 1209600, time_format: 604800, ago: 'weeks ago', next: 'weeks from now', count: true},
	{time: 2419200, time_format: 2419200, ago: 'Last month', next: 'Next month', count: false},
	{time: 4838400, time_format: 2419200, ago: 'months ago', next: 'months from now', count: true},
	{time: 29030400, time_format: 29030400, ago: 'Last year', next: 'Next year', count: false},
	{time: 58060800, time_format: 29030400, ago: 'years ago', next: 'years from now', count: true},
	{time: 2903040000, time_format: 2903040000, ago: 'Last century', next: 'Next century', count: false},
	{time: 5806080000, time_format: 2903040000, ago: 'centuries ago', next: 'centuries from now', count: true}
]

function getFormatTime(time, type){
	var seconds = Math.floor((new Date().getTime() - time) / 1000);

	var text = 'Now';
	var count = false;
	var time_format = 1;

	for(var i = 0; i < timeFormats.length; i++){
		if(seconds >= timeFormats[i]['time']){
			text = timeFormats[i][type];
			count = timeFormats[i]['count'];
			time_format = timeFormats[i]['time_format'];
		}
	}

	if(count){
		return Math.floor(seconds / time_format) + ' ' + text;
	} else {
		return text;
	}
}

//CHAT
function chat_addIgnore(user, time){
	var DIV = '<div class="chat-ignore bg-card rounded-2 flex flex-row gap-2 items-center px-2" data-userid="' + user.userid + '">';
		DIV += createAvatarField(user, 'medium', '', '');

		DIV += '<div class="flex flex-col gap-1 justify-center w-full overflow-hidden">';
			DIV += '<div class="text-base truncate">' + user.name + '</div>';
			DIV += '<div class="text-xs truncate">' + time + '</div>';
		DIV += '</div>';

		DIV += '<button class="chat_send_command button button-primary shadow-2" data-command="/unignore ' + user.userid + '">Unignore</button>';
	DIV += '</div>';

	$('#chat_ignorelist').append(DIV);
}

function chat_message(message) {
	if(message.type == 'system'){
        var messageid = Math.floor(Math.random() * 100000);

		$('#chat-area').append(chatSystemMessage({
            id: messageid,
            message: message.message,
            time: getFormatTime(message.time * 1000, 'ago'),
            script: '<script>setInterval(function(){$(".chat-message[data-message=' + messageid + '] .chat-message-time").text(getFormatTime(' + message.time * 1000 + ', "ago"))}, 1000)</script>'
        }));
	} else if(message.type == 'player'){
		if(chat_ignoreList.includes(message.user.userid)) return;

	    $('#chat-area').append(chatUserMessage({
            id: message.id,
            user: message.user,
            rank: message.rank,
            message: chat_checkEmotes(chat_checkMention(message.message, message.mentions)),
            reply: message.reply ? {
                user: message.reply.user,
                message: chat_checkEmotes(chat_checkMention(message.reply.message, message.reply.mentions))
            } : null,
            time: getFormatTime(message.time * 1000, 'ago'),
            script: '<script>setInterval(function(){$(".chat-message[data-message=' + message.id + '] .chat-message-time").text(getFormatTime(' + message.time * 1000 + ', "ago"))}, 1000)</script>'
        }));
	}

	if(!chat_isPaused){
		while($('#chat-area .chat-message').length > chat_maxMessages) $('#chat-area .chat-message').first().remove();

		$('#chat-area').scrollTop(5000);

		setTimeout(function(){
			$('#chat-area').scrollTop(5000);
			$('#chat_paused').addClass('hidden');

			chat_isPaused = false;
		}, 200);
	}
}

//EMOTES
function chat_checkEmotes(message) {
	var emotes = {
		'smile': 'png', 'smiley': 'png', 'grin': 'png', 'pensive': 'png', 'weary': 'png', 'astonished': 'png', 'rolling_eyes': 'png', 'relaxed': 'png', 'wink': 'png', 'woozy_face': 'png', 'zany_face': 'png', 'hugging': 'png', 'joy': 'png', 'sob': 'png', 'grimacing': 'png', 'rofl': 'png', 'face_monocle': 'png', 'thinking': 'png', 'pleading_face': 'png', 'sleeping': 'png', 'sunglasses': 'png', 'heart_eyes': 'png', 'smiling_hearts': 'png', 'kissing_heart': 'png', 'star_struck': 'png', 'nerd': 'png', 'innocent': 'png', 'face_vomiting': 'png', 'money_mouth': 'png', 'cold_sweat': 'png', 'partying_face': 'png', 'exploding_head': 'png', 'rage': 'png', 'hot_face': 'png', 'cold_face': 'png', 'smiling_imp': 'png', 'alien': 'png', 'clown': 'png', 'scream_cat': 'png', 'smiley_cat': 'png', 'robot': 'png', 'ghost': 'png', 'skull': 'png', 'poop': 'png', 'jack_o_lantern': 'png', '100': 'png', 'bell': 'png', 'birthday': 'png', 'gift': 'png', 'first_place': 'png', 'trophy': 'png', 'tada': 'png', 'crown': 'png', 'fire': 'png', 'heart': 'png', 'broken_heart': 'png', 'wave': 'png', 'clap': 'png', 'raised_hands': 'png', 'thumbsup': 'png', 'peace': 'png', 'ok_hand': 'png', 'muscle': 'png', 'punch': 'png', 'moneybag': 'png',
		'crypepe': 'png', 'firinpepe': 'png', 'happepe': 'png', 'monkachrist': 'png', 'okpepe': 'png', 'sadpepe': 'png',
		'gaben': 'png', 'kappa': 'png', 'kappapride': 'png', 'kim': 'png', 'pogchamp': 'png', 'shaq': 'png',
		'alert': 'gif', 'awp': 'gif', 'bananadance': 'gif', 'carlton': 'gif', 'fortdance': 'gif', 'grenade': 'gif', 'lolizard': 'gif', 'partyblob': 'gif', 'saxguy': 'gif', 'squidab': 'gif', 'turtle': 'gif', 'zombie': 'gif',
		'bet': 'png', 'cant': 'png', 'cashout': 'png', 'doit': 'png', 'dont': 'png', 'feelsbad': 'png', 'feelsgood': 'png', 'gg': 'png', 'gl': 'png', 'highroller': 'png', 'joinme': 'png', 'letsgo': 'png', 'win': 'png', 'lose': 'png', 'nice': 'png', 'sniped': 'png', 'midtick': 'png', 'lowtick': 'png'
	};

	Object.keys(emotes).forEach(function(item){
        message = message.replace(new RegExp(":" + item + ":( |$)", "g"), "<img class='emojis-chat-icon' src='/img/emojis/" + item + "." + emotes[item] + "'> ");
    });

	return message;
}

//CHECK MENTIONS NAME
function chat_checkMention(message, mentions){
	mentions.forEach(function(mention){
		while(message.indexOf(mention.mention) != -1){
			if(mention.mention.replace('@', '') == USERID) {
				message = message.replace(mention.mention, '<div class="chat-mention inline-block bg-info rounded-1 px-1">' + mention.name + '</div>');
			} else {
				message = message.replace(mention.mention, mention.name);
			}
		}
	});

	return message;
}

//SCROLL CHAT
function chat_checkScroll(){
	var scroll_chat = $('#chat-area').scrollTop() + $('#chat-area').innerHeight();
	var scroll_first_message = $('#chat-area')[0].scrollHeight;

	if(Math.ceil(scroll_chat) >= Math.floor(scroll_first_message)) return true;
	return false;
}

//ON RESIZE CHAT
function resize_pullout(pullout, hide) {
    if(app.paths[0] == 'admin' && pullout != 'admin') return;

    if(hide) $('#page').removeClass(pullout + '-active');
    else $('#page').addClass(pullout + '-active');
}

$(document).ready(function() {
	$(window).resize(function() {
		if(isOnMobile()) $('.pullout.active').css('width', $(window).width() + 'px');
	});

    if(isOnMobile()) resize_pullout('admin', true);

    setTimeout(function(){
        $('.pullout').addClass('transition duration-500');
        $('.slider').addClass('transition duration-500');

        $('.main-panel').addClass('transition duration-500');
    }, 10);
});

$(document).ready(function() {
	$(document).on('input', '.betamount', function() {
		var amount = $(this).val();
		var game = $(this).attr('data-game');

		amount = getNumberFromString(amount);
		amount = getFormatAmount(amount);

        if(game == 'tower') towerGame_generateAmounts(amount);
	});

	$(document).on('click', '.betshort_action', function() {
		var $field = $(this).closest('.input_field');
		var $input = $field.find('.field_element_input');

		var game = $(this).data('game');

		var amount = $input.val();

		amount = getNumberFromString(amount);

		var bet_amount = getFormatAmount(amount);
		var action = $(this).data('action');

		if (action == 'clear') {
			bet_amount = 0;
		} else if (action == 'double') {
			bet_amount *= 2;
		} else if (action == 'half') {
			bet_amount /= 2;
		} else if (action == 'max') {
			bet_amount = BALANCES.main;
		} else {
			action = getNumberFromString(action);
			bet_amount += getFormatAmount(action);
		}

		$input.val(getFormatAmountString(bet_amount));

        if(game == 'tower') towerGame_generateAmounts(bet_amount);

		$input.trigger('input');
		changeInputFieldLabel($field);
	});

	$(document).on('click', '.changeshort_action', function() {
		var fixed = parseInt($(this).data('fixed'));

		var $input = $($(this).data('id'));
		var $field = $input.closest('.input_field');

		var value = $input.val();
		value = getNumberFromString(value);

		if(fixed) var new_value = roundedToFixed(value, 2);
		else var new_value = parseInt(value);

		var action = $(this).data('action');

		if (action == 'clear') {
			new_value = 0;
		} else {
			action = getNumberFromString(action);

			if(fixed) new_value += roundedToFixed(action, 2);
			else new_value += parseInt(action);
		}

		if(fixed) $input.val(roundedToFixed(new_value, 2).toFixed(2));
		else $input.val(Math.floor(new_value));

		$input.trigger('input');
		changeInputFieldLabel($field);
	});

	//SHOW / HIDE CHAT MESSAGE MENU
	$(document).on('click', '.chat-message-open-menu', function() {
		if($(this).closest('.chat-message').find('.chat-message-menu').hasClass('hidden')){
			$('.chat-message-menu:not(.hidden)').each(function(i, e) {
				var $MENU = $(this);

				$MENU.css('opacity', 0);

				setTimeout(function(){
					$MENU.addClass('hidden');
				}, 200);
			});

			var $MENU = $(this).closest('.chat-message').find('.chat-message-menu');

			$MENU.html('<div class="chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2">Loading...</div>');

            setTimeout(function(){
                $MENU.removeClass('hidden');

                setTimeout(function(){
                    $MENU.css('opacity', 1);
                }, 10);
            }, 10);

			var message = parseInt($(this).closest('.chat-message').attr('data-message'));

			send_request_socket({
				type: 'chat',
				command: 'commands',
				message: message
			});
		}
	});

	$(document).on('click', ':not(.chat-message-menu):not(.chat-message-menu > *)', function(e) {
		if(e.target !== this) return;

		$('.chat-message-menu:not(.hidden)').each(function(i, e) {
			var $MENU = $(this);

			$MENU.css('opacity', 0);

			setTimeout(function(){
				$MENU.addClass('hidden');
			}, 200);
		});
	});

	//SHOW / HIDE BALANCES
    $(document).on('click', '.balances', function() {
		if($('.balances .list').hasClass('hidden')){
            setTimeout(function(){
                $('.balances .list').removeClass('hidden');

                setTimeout(function(){
                    $('.balances .list').css('opacity', 1);
                }, 10);
            }, 10);
        }
	});

	$(document).on('click', ':not(.balances .list):not(.balances .list *)', function(e) {
		if(e.target !== this) return;

        if(!$('.balances .list').hasClass('hidden')){
            $('.balances .list').css('opacity', 0);

            setTimeout(function(){
                $('.balances .list').addClass('hidden');
            }, 200);
        }
	});

	//SELECT BALANCE
	$(document).on('click', '.balances .list .balance', function() {
		var balance = $(this).attr('data-type');

		profile_settingsChange('balance', balance);

		$('.balances .list').css('opacity', 0);

		setTimeout(function(){
			$('.balances .list').addClass('hidden');
		}, 200);
	});

	//SHOW / HIDE GAMES
    $(document).on('click', '.header .games', function() {
		if($('.header .games .select').hasClass('hidden')){
            setTimeout(function(){
                $('.header .games .select').removeClass('hidden');

                setTimeout(function(){
                    $('.header .games .select').css('opacity', 1);
                }, 10);
            }, 10);
        }
	});

	$(document).on('click', ':not(.header .games .select):not(.header .games .select *)', function(e) {
		if(e.target !== this) return;

        if(!$('.header .games .select').hasClass('hidden')){
            $('.header .games .select').css('opacity', 0);

            setTimeout(function(){
                $('.header .games .select').addClass('hidden');
            }, 200);
        }
	});

	//SHOW / HIDE SETTINGS
    $(document).on('click', '.header .user', function() {
		if($('.header .user .select').hasClass('hidden')){
            setTimeout(function(){
                $('.header .user .select').removeClass('hidden');

                setTimeout(function(){
                    $('.header .user .select').css('opacity', 1);
                }, 10);
            }, 10);
        }
	});

	$(document).on('click', ':not(.header .user .select):not(.header .user .select *)', function(e) {
		if(e.target !== this) return;

        if(!$('.header .user .select').hasClass('hidden')){
            $('.header .user .select').css('opacity', 0);

            setTimeout(function(){
                $('.header .user .select').addClass('hidden');
            }, 200);
        }
	});

	//SELLECT LANGUAGE
	$('#chat_channel').on('change', function() {
		send_request_socket({
			type: 'chat',
			command: 'channel',
			channel: $(this).val()
		});
	});

	//CHAT PAUSED
	$('#chat-area').bind('scroll', function() {
		if(chat_checkScroll()) {
			$('#chat_paused').addClass('hidden');

			chat_isPaused = false;
		} else {
			$('#chat_paused').removeClass('hidden');

			chat_isPaused = true;
		}
	});

	$('#chat_paused').on('click', function(){
		$('#chat_paused').addClass('hidden');

		chat_isPaused = false;

		$('#chat-area').animate({
			scrollTop: 5000
		},{
			duration: 500
		});
	});

	//SHOW / HIDE EMOGIES
	$(document).on('click', '#chat_emojis', function() {
		$('.emojis-panel').removeClass('hidden');

		setTimeout(function(){
			$('.emojis-panel').css('opacity', 1);
		}, 10);
	});

	$(document).on('click', ':not(#chat_emojis):not(#chat_emojis > *):not(.emojis-panel > *):not(.emojis-panel)', function(e) {
		if(e.target !== this) return;

		$('.emojis-panel').css('opacity', 0);

		setTimeout(function(){
			$('.emojis-panel').addClass('hidden');
		}, 200);
	});

	//WRITE EMOGIES
	$(document).on('click', '.chat-emoji', function() {
		var smile = $(this).data('emoji');

		$('#chat_message').val($('#chat_message').val() + smile + ' ');
		$('#chat_message').focus();
	});

	//WRITE COMMAND
	$(document).on('click', '.chat_write_command', function(){
		var command = $(this).data('command');

		if($('#chat_message').val().toString().trim().length > 0) $('#chat_message').val($('#chat_message').val().toString().trim() + ' ' + command).focus();
		else $('#chat_message').val(command).focus();
	});

	//SEND COMMAND
	$(document).on('click', '.chat_send_command', function(){
		var command = $(this).data('command');

		send_request_socket({
			type: 'chat',
			command: 'message',
			message: command,
			channel: profile_settingsGet('channel')
		});
	});

	//SEND COINS
	$(document).on('click', '#send_tip_player', function(){
		var amount = $('#tip_player_amount').val();
		var userid = $(this).attr('data-userid');

		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'account',
				'command': 'tip',
				'userid': userid,
				'amount': amount,
				'recaptcha': render
			});
		});
	});

	//MUTE PLAYER
	$(document).on('click', '#mute_player_set', function(){
		var reason = $('#mute_player_reason').val();
		var amount = $('#mute_player_amount').val().toString();
		var date = $('#mute_player_date').val().toString();

		var userid = $(this).attr('data-userid');

		send_request_socket({
			'type': 'account',
			'command': 'mute',
			'userid': userid,
			'time': amount + date,
			'reason': reason
		});
	});

	$(document).on('click', '#mute_player_permanently', function(){
		var reason = $('#mute_player_reason').val();

        var userid = $(this).attr('data-userid');

		send_request_socket({
			'type': 'account',
			'command': 'mute',
			'userid': userid,
			'time': 'permanent',
			'reason': reason
		});
	});

	//SUBMIT MESSAGE
	$('#chat-input-form').on('submit', function() {
		var message = $('#chat_message').val();

		if (message.toString().trim().length > 0) {
			send_request_socket({
				type: 'chat',
				command: 'message',
				message: message,
				channel: profile_settingsGet('channel'),
				reply: chat_replyMessage
			});

			$('#chat_message').val('');

			$('#chat_reply').addClass('hidden');

			chat_replyMessage = null;
		}

		return false;
	});

	//REPLY MESSAGE
	$(document).on('click', '.chat_reply_message', function(){
		var reply = JSON.parse($(this).attr('data-reply'));

		chat_replyMessage = reply.id;

		$('#chat_reply').find('.avatar').attr('src', reply.user.avatar);
		$('#chat_reply').find('.name').text(reply.user.name);

		$('#chat_reply').find('.message').html(reply.message);

		$('#chat_reply').removeClass('hidden');

		if(chat_checkScroll()) {
			$('#chat_paused').addClass('hidden');

			chat_isPaused = false;
		} else {
			$('#chat_paused').removeClass('hidden');

			chat_isPaused = true;
		}

		$('#chat_message').focus();
	});

	$(document).on('click', '#chat_reply_close', function(){
		$('#chat_reply').addClass('hidden');

		chat_replyMessage = null;
	});

	//RAIN
	$(document).on('click', '#chat_rain_join', function(){
		requestRecaptcha(function(render){
			send_request_socket({
				'type': 'rain',
				'command': 'join',
				'recaptcha': render
			});
		});
	});

	$(document).on('click', '#chat_rain_tip', function(){
		var amount = getFormatAmount($('#chat_rain_tip_amount').val());

		send_request_socket({
			'type': 'rain',
			'command': 'tip',
			'amount': amount
		});
	});
});

/* END CHAT */

/* CRASH */

var crashGame_timeout = null;

function crashGame_resize(){
    if(crashGame_timeout) {
        clearTimeout(crashGame_timeout);

        crashGame_timeout = null;
    }

    crashGame_timeout = setTimeout(function(){
        $('#crash_canvas').addClass('hidden');

        var width = $('#crash_canvas').parent().width();
        var height = $('#crash_canvas').parent().height();

        if(width <= 0) width = 100;
        if(height <= 0) height = 100;

        canvas.width = width;
        canvas_responsive = 0;

        if(width > 750) {
            width = 750;

            canvas_responsive = 1;
        }

        canvas.height = height;

        $('#crash_canvas').removeClass('hidden');
    }, 10);
}

function crashGame_addGame(bet) {
	$('#crash_betlist > :not(.table-row)').remove();

	$('#crash_betlist').prepend(crashBet({
		...bet,
		...{
			amount: getFormatAmountString(bet.amount),
			profit: bet.profit ? getFormatAmountString(bet.profit) : null
		}
	}));

	$('#crash_betlist > .table-row[data-id="' + bet.id + '"]').slideUp(0).slideDown('fast');
}

function crashGame_addHistory(crash){
	$('#crash_history').prepend(crashHistory({ value: crash }));

	while($('#crash_history .item').length > 20) $('#crash_history .item').last().remove();
}

function crashGame_editBet(bet){
	$('#crash_betlist > .table-row[data-id="' + bet.id + '"] .at').text(roundedToFixed(bet.cashout, 2).toFixed(2));
	$('#crash_betlist > .table-row[data-id="' + bet.id + '"] .profit').text(getFormatAmountString(bet.profit));
	$('#crash_betlist > .table-row[data-id="' + bet.id + '"]').removeClass('text-primary').addClass('text-success');
}

$(document).ready(function() {
	$('#crash_bet').on('click', function() {
		$(this).addClass('disabled');

		var amount = $('#betamount_crash').val();
		var auto = Math.floor($('#betauto_crash').val() * 100);

		send_request_socket({
			'type': 'crash',
			'command': 'bet',
			'amount': amount,
			'auto': auto
		});
	});

	$('#crash_cashout').on('click', function() {
		$(this).addClass('disabled');

		send_request_socket({
			'type': 'crash',
			'command': 'cashout'
		});
	});

	$(document).on('click', '.betshort_action[data-game="crash"]', function() {
		sounds_play('select');
	});

	$(document).on('click', '.changeshort_action[data-id="#betauto_crash"]', function() {
		sounds_play('select');
	});
});

/* END CRASH */

/* COINFLIP */

function coinflipGame_addCoinFlip(coinflip){
	// Hide empty state when adding a flip
	$('#coinflip_empty_state').addClass('hidden');
	
	// Remove skeleton loaders if present (they have class coinflip-game but no active class)
	var $skeleton = $('#coinflip_betlist .coinflip-game:not(.active)').first();
	if($skeleton.length === 0) {
		// No skeleton found, append a new game container
		$('#coinflip_betlist').append('<div class="coinflip-game bg-secondary rounded-2 border-2 border-card"></div>');
		$skeleton = $('#coinflip_betlist .coinflip-game:not(.active)').first();
	}
	
	// Determine status (use provided status or default to 0)
	var flipStatus = coinflip.status !== undefined ? coinflip.status : 0;
	
	$skeleton.html(coinflipBet({
        id: coinflip.id,
        status: flipStatus,
        players: coinflip.players,
        amount: getFormatAmountString(coinflip.amount),
        joined: coinflip.players.some(a => a.user && a.user.userid == USERID) || false,
		creator: coinflip.players.some(a => a.user && a.user.userid == USERID && a.creator) || false,
        isBotFlip: coinflip.isBotFlip === true, // Pass bot flip flag
        data: coinflip.data || {}
    })).addClass('active');

	var last_game = $('#coinflip_betlist .coinflip-game.active').last().index() + 1;
	for(var i = 0; i < (last_game % 5 == 0 ? 1 : 0) * 5; i++) {
		$('#coinflip_betlist').append('<div class="coinflip-game bg-secondary rounded-2 border-2 border-card"></div>');
	}
	
	// Log flips count for debugging
	var activeFlips = $('#coinflip_betlist .coinflip-game.active').length;
	console.log('[COINFLIP] Active flips count:', activeFlips);
}

function coinflipGame_editCoinFlip(coinflip){
	$('#coinflip_betlist .coinflip-game .coinflip_betitem[data-id="' + coinflip.id + '"]').replaceWith(coinflipBet({
        id: coinflip.id,
        status: coinflip.status,
        players: coinflip.players,
        amount: getFormatAmountString(coinflip.amount),
        joined: coinflip.players.some(a => a.user.userid == USERID),
		creator: coinflip.players.some(a => a.user.userid == USERID && a.creator),
        isBotFlip: coinflip.isBotFlip === true, // Pass bot flip flag
        data: coinflip.data
    }));

    if(coinflip.status == 3){
        setTimeout(function(){
            sounds_play('coinflip_start');
        }, 2000);
    }
}

$(document).ready(function() {
	$(document).on('click', '.coinflip-join', function() {
		var $btn = $(this);
		var id = $btn.attr('data-id');
		
		// Check if this is a bot-only flip
		var $card = $btn.closest('.coinflip-card');
		if($card.length && $card.data('isBotFlip') === true) {
			toastr['warning']('Bots only play bots. This is a simulated game for liveliness.', '', {
				timeOut: 3000
			});
			return;
		}

		$btn.addClass('disabled');

		send_request_socket({
			type: 'coinflip',
			command: 'join',
			id: id
		});
	});

	$(document).on('click', '.coinflip-callbot', function() {
		$(this).addClass('disabled');

		var id = $(this).attr('data-id');

		send_request_socket({
			'type': 'gamebots',
			'command': 'confirm',
			'game': 'coinflip',
			'data': {
				'id': id
			}
		});
	});

	$(document).on('click', '.coinflip-select', function(){
		$('.coinflip-select').removeClass('active');
		$(this).addClass('active');

		sounds_play('select');
	});

	$('#coinflip_create').click(function() {
		$(this).addClass('disabled');

		var amount = $('#betamount_coinflip').val();
		var position = parseInt($('.coinflip-select.active').attr('data-position'));

		send_request_socket({
			type: 'coinflip',
			command: 'create',
			amount: amount,
			position: position
		});
	});

	$(document).on('click', '.betshort_action[data-game="coinflip"]', function() {
		sounds_play('select');
	});
});

/* END COINFLIP */

/* MINESWEEPER */

$(document).ready(function() {
	$(document).on('click', '#minesweeper_bet', function() {
		$(this).addClass('disabled');

		var amount = $('#betamount_minesweeper').val();
		var bombs = $('#bombsamount_minesweeper').val();

		send_request_socket({
			'type': 'minesweeper',
			'command': 'bet',
			'bombs': bombs,
			'amount': amount
		});
	});

	$(document).on('click', '#minesweeper_bombs .item', function() {
		var bomb = $(this).data('bomb');

		send_request_socket({
			'type': 'minesweeper',
			'command': 'bomb',
			'bomb': bomb
		});
	});

	$(document).on('click', '#minesweeper_cashout', function() {
		$(this).addClass('disabled');

		send_request_socket({
			'type': 'minesweeper',
			'command': 'cashout'
		});
	});

	$(document).on('click', '.minesweeper-bombsamount', function() {
		var amount = parseInt($(this).attr('data-amount'));

		$('.minesweeper-bombsamount').removeClass('active');
		$(this).addClass('active');

		$('#bombsamount_minesweeper').val(amount);

		sounds_play('select');
	});

	$(document).on('input', '#bombsamount_minesweeper', function() {
		var amount = parseInt($(this).val());

		$('.minesweeper-bombsamount').removeClass('active');
		$('.minesweeper-bombsamount[data-amount="' + amount + '"]').addClass('active');
	});

	$(document).on('click', '.changeshort_action[data-id="#bombsamount_minesweeper"]', function() {
		sounds_play('select');
	});

	$(document).on('click', '.betshort_action[data-game="minesweeper"]', function() {
		sounds_play('select');
	});
});

/* END MINESWEEPER */

/* TOWER */

var towerGame_multipliers = {};
var towerGame_difficulty = 'medium';

var towerGame_tiles = {
	'easy': 4,
	'medium': 3,
	'hard': 2,
	'expert': 3,
	'master': 4
};

function towerGame_generateTiles(){
	$('#tower_grid').removeClass('easy').removeClass('medium').removeClass('hard').removeClass('expert').removeClass('master')
	$('#tower_grid').addClass(towerGame_difficulty);

	var DIV = '';

	for(var i = 8; i >= 0; i--){
		for(var j = 0; j < towerGame_tiles[towerGame_difficulty]; j++){
			DIV += '<div class="item flex justify-center items-center disabled" data-stage="' + i + '" data-button="' + j + '">0.00</div>';
		}
	}

	$('#tower_grid').html(DIV);

	var amount = $('#betamount_tower').val();

	amount = getNumberFromString(amount);
	amount = getFormatAmount(amount);

	towerGame_generateAmounts(amount);
}

function towerGame_generateAmounts(amount){
	for(var i = 0; i < towerGame_multipliers[towerGame_difficulty].length; i++){
		$('#tower_grid .item[data-stage="' + i + '"]').text((amount * towerGame_multipliers[towerGame_difficulty][i]).toFixed(2));
	}
}

$(document).ready(function() {
	$(document).on('click', '#tower_bet', function(){
		$(this).addClass('disabled');

		var amount = $('#betamount_tower').val();

		send_request_socket({
			'type': 'tower',
			'command': 'bet',
			'amount': amount,
			'difficulty': towerGame_difficulty
		});
	});

	$(document).on('click', '#tower_grid .item', function(){
		var stage = $(this).data('stage');
		var button = $(this).data('button');

		send_request_socket({
			'type': 'tower',
			'command': 'stage',
			'stage': stage,
			'button': button
		});
	});

	$(document).on('click', '#tower_cashout', function(){
		$(this).addClass('disabled');

		send_request_socket({
			'type': 'tower',
			'command': 'cashout'
		});
	});

	$(document).on('change', '#tower_difficulty', function(){
		towerGame_difficulty = $(this).val();

		towerGame_generateTiles();

		sounds_play('select');
	});

	$(document).on('click', '.betshort_action[data-game="tower"]', function() {
		sounds_play('select');
	});
});

/* END TOWER */

/* BLACKJACK */

function blackjack_renderHand($root, cards){
	$root.empty();

	(cards || []).forEach(function(card){
		if(card === null || card === undefined){
			$root.append('<div class="blackjack-card hidden">??</div>');
			return;
		}

		var label = blackjack_cardLabel(card);
		$root.append('<div class="blackjack-card">' + label + '</div>');
	});
}

function blackjack_cardLabel(index){
	var i = parseInt(index, 10);
	if(isNaN(i)) return '??';

	var suit = Math.floor(i / 13); // 0..3
	var rank = (i % 13) + 1;       // 1..13

	var rankLabel = (rank === 1) ? 'A' : (rank === 11) ? 'J' : (rank === 12) ? 'Q' : (rank === 13) ? 'K' : String(rank);
	var suitLabel = [ '♠', '♥', '♦', '♣' ][suit];

	return rankLabel + suitLabel;
}

function blackjack_applyState(game){
	// Guard: if server sends partial state.
	if(!game) return;

	// Interval amounts + house edge display
	if(games_intervalAmounts && games_intervalAmounts.blackjack){
		$('#blackjack_min').text(getFormatAmountString(games_intervalAmounts.blackjack.min));
		$('#blackjack_max').text(getFormatAmountString(games_intervalAmounts.blackjack.max));
	}
	if(games_houseEdges && games_houseEdges.blackjack !== undefined){
		$('#blackjack_house_edge').text(games_houseEdges.blackjack);
	}

	var state = game.state || game; // allow both shapes: {game:{state}} or {game}

	blackjack_renderHand($('#blackjack_player_hand'), state.player ? state.player.cards : []);
	blackjack_renderHand($('#blackjack_dealer_hand'), state.dealer ? state.dealer.cards : []);

	$('#blackjack_player_total').text(state.player ? state.player.total : 0);
	$('#blackjack_dealer_total').text(state.dealer ? state.dealer.total : 0);

	var active = state.active === true;
	var actions = state.actions || {};

	$('#blackjack_bet').toggleClass('disabled', active || actions.bet === false);
	$('#blackjack_hit').toggleClass('disabled', !active || actions.hit !== true);
	$('#blackjack_stand').toggleClass('disabled', !active || actions.stand !== true);

	if(!active) $('#blackjack_status_text').text('Place a bet and click Deal.');
	else $('#blackjack_status_text').text('Good luck!');
}

function blackjack_applyResult(payload){
	if(!payload) return;

	blackjack_applyState(payload.state);

	var result = payload.result;
	var statusText = 'Hand finished.';
	if(result === 'win') statusText = 'You win!';
	if(result === 'loss') statusText = 'You lose.';
	if(result === 'push') statusText = 'Push (tie).';
	if(result === 'blackjack') statusText = 'Blackjack! You win.';

	$('#blackjack_status_text').text(statusText);
}

$(document).ready(function() {
	$(document).on('click', '#blackjack_bet', function(){
		$(this).addClass('disabled');

		var amount = $('#betamount_blackjack').val();

		send_request_socket({
			'type': 'blackjack',
			'command': 'bet',
			'amount': amount
		});
	});

	$(document).on('click', '#blackjack_hit', function(){
		if($(this).hasClass('disabled')) return;
		$(this).addClass('disabled');

		send_request_socket({
			'type': 'blackjack',
			'command': 'hit'
		});
	});

	$(document).on('click', '#blackjack_stand', function(){
		if($(this).hasClass('disabled')) return;
		$(this).addClass('disabled');

		send_request_socket({
			'type': 'blackjack',
			'command': 'stand'
		});
	});

	$(document).on('click', '.betshort_action[data-game="blackjack"]', function() {
		sounds_play('select');
	});
});

/* END BLACKJACK */

/* CASINO */

function pagination_addCasinoSlotsGames(list){
    if(list.length > 0) {
        $('#casino_slots_games').empty();

		list.forEach(function(item){
            $('#casino_slots_games').append(casinoGame(item));
        });
    } else {
		$('#casino_slots_games').html(emptyState({
			title: 'No games found'
		}));
	}
}

function pagination_addCasinoLiveGames(list){
    if(list.length <= 0) {
        $('#casino_live_games').empty();

		list.forEach(function(item){
            $('#casino_live_games').append(casinoGame(item));
        });
    } else {
		$('#casino_live_games').html(emptyState({
			title: 'No games found'
		}));
	}
}

function pagination_addCasinoFavoritesGames(list){
    if(list.length <= 0) {
        $('#casino_favorites_games').empty();

		list.forEach(function(item){
            $('#casino_favorites_games').append(casinoGame(item));
        });
    } else {
		$('#casino_favorites_games').html(emptyState({
			title: 'No games found'
		}));
	}
}

function pagination_addCasinoAllGames(list){
    if(list.length <= 0) {
        $('#casino_all_games').empty();

		list.forEach(function(item){
            $('#casino_all_games').append(casinoGame(item));
        });
    } else {
		$('#casino_all_games').html(emptyState({
			title: 'No games found'
		}));
	}
}

$(document).ready(function() {
    $(document).on('click', '.casino-list .item .favorite, .casino-games .item .favorite', function() {
        var id = $(this).closest('.item').attr('data-id');

		if($(this).hasClass('active')){
            send_request_socket({
                'type': 'casino',
                'command': 'unset_favorite',
                'id': id
            });
        } else {
            send_request_socket({
                'type': 'casino',
                'command': 'set_favorite',
                'id': id
            });
        }
	});

    $(document).on('click', '#casino_favorite', function() {
        if($(this).hasClass('active')){
            send_request_socket({
                'type': 'casino',
                'command': 'unset_favorite',
                'id': app.paths[2]
            });
        } else {
            send_request_socket({
                'type': 'casino',
                'command': 'set_favorite',
                'id': app.paths[2]
            });
        }
	});

    $(document).on('change', '#casino_game_mode', function() {
        var real = $(this).is(':checked');

        if(real) window.location.href = '/casino/slots/' + app.paths[2];
        else window.location.href = '/casino/slots/' + app.paths[2] + '/demo';
    });

    $(document).on('click', '#casino_game_fullscreen', function() {
        var element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    });

    $(document).on("fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange", function () {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
           $('#page').addClass('fullscreen');
        } else {
            $('#page').removeClass('fullscreen');
        }
    });

    $(document).on('click', '#pagination_casino_slots_games .pagination-item', function() {
		$('#casino_slots_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_slots_games').append(casinoGameSkeleton());

		var page = $(this).attr('data-page');

		var order = parseInt($('#casino_slots_games_order').val());
		var provider = $('#casino_slots_games_provider').val();
		var search = $('#casino_slots_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_slots_games',
			'page': page,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	var timeout_casino_slots_games = null;
	$('#casino_slots_games_search').on('input', function() {
		if(timeout_casino_slots_games) clearTimeout(timeout_casino_slots_games);

		timeout_casino_slots_games = setTimeout(function(){
			$('#casino_slots_games').empty();
            for(var i = 0; i < 100; i++) $('#casino_slots_games').append(casinoGameSkeleton());

            var order = parseInt($('#casino_slots_games_order').val());
		    var provider = $('#casino_slots_games_provider').val();
			var search = $('#casino_slots_games_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'casino_slots_games',
				'page': 1,
				'order': order,
				'provider': provider,
				'search': search
			});
		}, 1000);
	});

	$('#casino_slots_games_order').on('change', function() {
		$('#casino_slots_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_slots_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_slots_games_order').val());
		var provider = $('#casino_slots_games_provider').val();
		var search = $('#casino_slots_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_slots_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	$('#casino_slots_games_provider').on('change', function() {
		$('#casino_slots_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_slots_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_slots_games_order').val());
		var provider = $('#casino_slots_games_provider').val();
		var search = $('#casino_slots_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_slots_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

    $(document).on('click', '#pagination_casino_live_games .pagination-item', function() {
		$('#casino_live_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_live_games').append(casinoGameSkeleton());

		var page = $(this).attr('data-page');

		var order = parseInt($('#casino_live_games_order').val());
		var provider = $('#casino_live_games_provider').val();
		var search = $('#casino_live_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_live_games',
			'page': page,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	var timeout_casino_live_games = null;
	$('#casino_live_games_search').on('input', function() {
		if(timeout_casino_live_games) clearTimeout(timeout_casino_live_games);

		timeout_casino_live_games = setTimeout(function(){
			$('#casino_live_games').empty();
            for(var i = 0; i < 100; i++) $('#casino_live_games').append(casinoGameSkeleton());

            var order = parseInt($('#casino_live_games_order').val());
		    var provider = $('#casino_live_games_provider').val();
			var search = $('#casino_live_games_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'casino_live_games',
				'page': 1,
				'order': order,
				'provider': provider,
				'search': search
			});
		}, 1000);
	});

	$('#casino_live_games_order').on('change', function() {
		$('#casino_live_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_live_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_live_games_order').val());
		var provider = $('#casino_live_games_provider').val();
		var search = $('#casino_live_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_live_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	$('#casino_live_games_provider').on('change', function() {
		$('#casino_live_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_live_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_live_games_order').val());
		var provider = $('#casino_live_games_provider').val();
		var search = $('#casino_live_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_live_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

    $(document).on('click', '#pagination_casino_favorites_games .pagination-item', function() {
		$('#casino_favorites_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_favorites_games').append(casinoGameSkeleton());

		var page = $(this).attr('data-page');

		var order = parseInt($('#casino_favorites_games_order').val());
		var provider = $('#casino_favorites_games_provider').val();
		var search = $('#casino_favorites_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_favorites_games',
			'page': page,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	var timeout_casino_favorites_games = null;
	$('#casino_favorites_games_search').on('input', function() {
		if(timeout_casino_favorites_games) clearTimeout(timeout_casino_favorites_games);

		timeout_casino_favorites_games = setTimeout(function(){
			$('#casino_favorites_games').empty();
            for(var i = 0; i < 100; i++) $('#casino_favorites_games').append(casinoGameSkeleton());

            var order = parseInt($('#casino_favorites_games_order').val());
		    var provider = $('#casino_favorites_games_provider').val();
			var search = $('#casino_favorites_games_search').val();

			send_request_socket({
				'type': 'pagination',
				'command': 'casino_favorites_games',
				'page': 1,
				'order': order,
				'provider': provider,
				'search': search
			});
		}, 1000);
	});

	$('#casino_favorites_games_order').on('change', function() {
		$('#casino_favorites_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_favorites_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_favorites_games_order').val());
		var provider = $('#casino_favorites_games_provider').val();
		var search = $('#casino_favorites_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_favorites_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

	$('#casino_favorites_games_provider').on('change', function() {
		$('#casino_favorites_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_favorites_games').append(casinoGameSkeleton());

		var order = parseInt($('#casino_favorites_games_order').val());
		var provider = $('#casino_favorites_games_provider').val();
		var search = $('#casino_favorites_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_favorites_games',
			'page': 1,
			'order': order,
			'provider': provider,
			'search': search
		});
	});

    $(document).on('click', '#pagination_casino_all_games .pagination-item', function() {
		$('#casino_all_games').empty();
        for(var i = 0; i < 100; i++) $('#casino_all_games').append(casinoGameSkeleton());

		var page = $(this).attr('data-page');

		var search = $('#casino_all_games_search').val();

		send_request_socket({
			'type': 'pagination',
			'command': 'casino_all_games',
			'page': page,
			'search': search
		});
	});

	var timeout_casino_all_games = null;
	$('#casino_all_games_search').on('input', function() {
        if(timeout_casino_all_games) clearTimeout(timeout_casino_all_games);

		var search = $('#casino_all_games_search').val().toString();

        if(search.length > 0){
            var first = $('#casino_lobby_games').hasClass('hidden');

		    if(first) {
                $('#casino_all_games').empty();
                for(var i = 0; i < 100; i++) $('#casino_all_games').append(casinoGameSkeleton());
            }

            timeout_casino_all_games = setTimeout(function(){
                if(!first) {
                    $('#casino_all_games').empty();
                    for(var i = 0; i < 100; i++) $('#casino_all_games').append(casinoGameSkeleton());
                }

                send_request_socket({
                    'type': 'pagination',
                    'command': 'casino_all_games',
                    'page': 1,
                    'search': search
                });
            }, 1000);

            $('#casino_lobby_games').removeClass('hidden');
            $('#casino_lobby_lists').addClass('hidden');
        } else {
            $('#casino_lobby_games').addClass('hidden');
            $('#casino_lobby_lists').removeClass('hidden');
        }
	});
});

/* END CASINO */

$(document).ready(function() {
	$(document).on('click', '#deposit_bonuses_apply', function() {
		var code = $('#deposit_bonuses_code').val();

		requestRecaptcha(function(render){
			send_request_socket({
				type: 'account',
				command: 'deposit_bonus',
				code: code,
				recaptcha: render
			});
		});
	});
});

/* CRYPTO TRADES */

var offers_currencyAmounts = {};
var offers_currencyFees = {};

$(document).ready(function() {
	$(document).on('input', '.crypto-panel [data-conversion="from"]', function() {
		var currency = $(this).attr('data-currency');

		var value = $('.crypto-panel [data-conversion="from"]').val();
		var amount = getNumberFromString(value);

		$('.crypto-panel [data-conversion="from"]').val(value);

		if(offers_currencyAmounts[currency] === undefined) $('.crypto-panel [data-conversion="to"]').val('0.00000000');
        else $('.crypto-panel [data-conversion="to"]').val((getFormatAmount(amount) / offers_currencyAmounts[currency]).toFixed(8));

        changeInputFieldLabel($('.crypto-panel [data-conversion="to"]').closest('.input_field'));

        if(app.page == 'withdraw'){
            if(offers_currencyFees[currency] === undefined) $('.crypto-panel [data-conversion="estimated"]').val('0.00000000');
            else $('.crypto-panel [data-conversion="estimated"]').val((getFormatAmount(amount) / offers_currencyAmounts[currency] - offers_currencyFees[currency]).toFixed(8));

            changeInputFieldLabel($('.crypto-panel [data-conversion="estimated"]').closest('.input_field'));
        }
	});

	$(document).on('input', '.crypto-panel [data-conversion="to"]', function() {
		var currency = $(this).attr('data-currency');

		var value = $('.crypto-panel [data-conversion="to"]').val();
		var amount = getNumberFromString(value);

		if(offers_currencyAmounts[currency] === undefined) $('.crypto-panel [data-conversion="from"]').val('0.00');
		else $('.crypto-panel [data-conversion="from"]').val(getFormatAmountString(offers_currencyAmounts[currency] * amount));

		$('.crypto-panel [data-conversion="to"]').val(value);
		if(app.page == 'withdraw') $('.crypto-panel [data-conversion="estimated"]').val(amount - offers_currencyFees[currency]);

		var $input_check = $('.crypto-panel [data-conversion="from"]');
		changeInputFieldLabel($input_check.closest('.input_field'));
	});

	$(document).on('input', '.crypto-panel [data-conversion="estimated"]', function() {
		var currency = $(this).attr('data-currency');

		var value = $('.crypto-panel [data-conversion="estimated"]').val();
		var amount = getNumberFromString(value);

		if(offers_currencyAmounts[currency] === undefined || offers_currencyFees[currency] === undefined) $('.crypto-panel [data-conversion="from"]').val('0.00');
		else $('.crypto-panel [data-conversion="from"]').val(getFormatAmountString(offers_currencyAmounts[currency] * (amount + offers_currencyFees[currency])));

		$('.crypto-panel [data-conversion="estimated"]').val(value);
		$('.crypto-panel [data-conversion="to"]').val(amount + offers_currencyFees[currency]);

		var $input_check = $('.crypto-panel [data-conversion="from"]');
		changeInputFieldLabel($input_check.closest('.input_field'));
	});

	$(document).on('click', '#crypto_deposit', function() {
		var currency = $(this).attr('data-currency');
        var value = $('#crypto_deposit_value').val();

		send_request_socket({
            type: 'crypto',
            command: 'deposit',
            currency: currency,
            value: value
        });
	});

	$(document).on('click', '#crypto_deposit_back', function() {
		$('#crypto_deposit_panel').removeClass('active');
	});

	$(document).on('click', '#crypto_withdraw', function() {
		var currency = $(this).attr('data-currency');
		var address = $('#currency_withdraw_address').val();
		var amount = $('#currency_withdraw_amount').val();

		requestRecaptcha(function(render){
			send_request_socket({
				type: 'crypto',
				command: 'withdraw',
				currency: currency,
				amount: amount,
				address: address,
				recaptcha: render
			});
		});
	});
});

/* END CRYPTO TRADES */

/* FAQ */

$(document).ready(function() {
	$(document).on('click', '.faq-open', function() {
		if($(this).parent().parent().hasClass('active')){
			$(this).parent().parent().removeClass('active');
		} else {
			$(this).parent().parent().addClass('active');
		}
	});
});

/* END FAQ */

/* FAIR */

$(document).ready(function() {
	$(document).on('click', '.fair-results', function() {
		var fair = JSON.parse($(this).attr('data-fair').toString());

		$('#fair_server_seed_hashed').text('-');
		$('#fair_server_seed').text('-');
		$('#fair_public_seed').text('-');
		$('#fair_nonce').text('-');
		$('#fair_block').text('-');
		$('#fair_block_link').attr('href', '');

		$('#fair_server_seed_hashed').attr('data-text', '');
		$('#fair_server_seed').attr('data-text', '');
		$('#fair_public_seed').attr('data-text', '');
		$('#fair_nonce').attr('data-text', '');

		if(fair.server_seed_hashed) $('#fair_server_seed_hashed').text(fair.server_seed_hashed);
		if(fair.server_seed) $('#fair_server_seed').text(fair.server_seed);
		if(fair.public_seed) $('#fair_public_seed').text(fair.public_seed);
		if(fair.nonce) $('#fair_nonce').text(fair.nonce);
		if(fair.block) {
			$('#fair_block').text(fair.block);
			$('#fair_block_link').attr('href', 'https://eosflare.io/block/' + fair.block);
		}

		$('#fair_server_seed_hashed').attr('data-text', fair.server_seed_hashed);
		$('#fair_server_seed').attr('data-text', fair.server_seed);
		$('#fair_public_seed').attr('data-text', fair.public_seed);
		$('#fair_nonce').attr('data-text', fair.nonce);

		if(fair.draw){
			$('#fair_draw').removeClass('hidden');

			$('#fair_draw_public_seed').text('-');
			$('#fair_draw_block').text('-');
			$('#fair_draw_block_link').attr('href', '');

			if(fair.draw.public_seed) $('#fair_draw_public_seed').text(fair.draw.public_seed);

			if(fair.draw.block) {
				$('#fair_draw_block').text(fair.draw.block);
				$('#fair_draw_block_link').attr('href', 'https://eosflare.io/block/' + fair.draw.block);
			}
		} else {
			$('#fair_draw').addClass('hidden');
		}

		$('#modal_fair_round').modal('show');
	});
});

/* END FAIR */

function isOnMobile(){
	return ($(window).width() <= 768);
}

function getInfosByItemName(name){
	var infos = {
		brand: null,
		name: null,
		exterior: null
	};

	var match = /^\s*(.*?)\s*(?:\|\s*(.*?)\s*(?:\(\s*(.*?)\s*\))?)?$/.exec(name);

	if(match && match[2]) {
		infos.brand = match[1] || null;
		infos.name = match[2] || null;
		infos.exterior = match[3] || null;
	} else infos.brand = name.trim();

	return infos;
}

function createLoader(){
	var DIV = '<div class="flex col-span-full justify-center items-center size-full history_message">';
		DIV += '<div class="loader">';
			DIV += '<div class="loader-part loader-part-1">';
				DIV += '<div class="loader-dot loader-dot-1"></div>';
				DIV += '<div class="loader-dot loader-dot-2"></div>';
			DIV += '</div>';

			DIV += '<div class="loader-part loader-part-2">';
				DIV += '<div class="loader-dot loader-dot-1"></div>';
				DIV += '<div class="loader-dot loader-dot-2"></div>';
			DIV += '</div>';
		DIV += '</div>';
	DIV += '</div>';

	return DIV;
}

function createAvatarField(user, type, more, classes){
	var level_class = ['tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond'][Math.floor(user.level / 25)];

	var DIV = '<div class="avatar-field rounded-full ' + classes + ' ' + level_class + ' relative">';
		DIV += '<img class="avatar icon-' + type + ' rounded-full" src="' + user.avatar + '">';
		DIV += '<div class="level sup-' + type + '-left flex justify-center items-center border-2 border-secondary rounded-full">' + user.level + '</div>';
		DIV += more;
	DIV += '</div>';

	return DIV;
}

function roundedToFixed(number, decimals){
	if(isNaN(Number(number))) return 0;

	number = Number((Number(number).toFixed(5)));

	var number_string = number.toString();
	var decimals_string = 0;

	if(number_string.split('.')[1] !== undefined) decimals_string = number_string.split('.')[1].length;

	while(decimals_string - decimals > 0) {
		number_string = number_string.slice(0, -1);

		decimals_string --;
	}

	return Number(number_string);
}

function getFormatAmount(amount){
	return roundedToFixed(amount, 2);
}

function getFormatAmountString(amount){
	return getFormatAmount(amount).toFixed(2);
}

function splitAmountCumulative(amount, parts) {
	var result = [];
	var prev = 0;

	for (var i = 1; i <= parts; i++) {
		var curr = getFormatAmount(amount * i / parts);
		result.push(getFormatAmount(curr - prev));

		prev = curr;
	}

	return result;
}

function getNumberFromString(amount){
	if(amount.toString().trim().length <= 0) return 0;
	if(isNaN(Number(amount.toString().trim()))) return 0;

	return amount;
}

function stringEscape(string){
	return string.toString().replace(/"/g, '&quot;');
}

function stringUnescape(string){
	return string.toString().replace(/(&quot;)/g, '"');
}

function generateCode(length) {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for(var i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

function getFormatSeconds(time){
	var days = Math.floor(time / (24 * 60 * 60));
	var hours = Math.floor((time - days * 24 * 60 * 60) / (60 * 60));
	var minutes = Math.floor((time - days * 24 * 60 * 60 - hours * 60 * 60) / 60);
	var seconds = Math.floor(time - days * 24 * 60 * 60 - hours * 60 * 60 - minutes * 60);

	return {
		days: '0'.concat(days.toString()).slice(-2),
		hours: '0'.concat(hours.toString()).slice(-2),
		minutes: '0'.concat(minutes.toString()).slice(-2),
		seconds: '0'.concat(seconds.toString()).slice(-2)
	};
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function capitalizeText(text){
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function time(){
	return Math.floor(new Date().getTime() / 1000);
}