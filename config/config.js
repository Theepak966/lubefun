const config = {
	settings: require('../settings.json'),

	app: {
		name: process.env.APP_NAME,
		abbreviation: process.env.APP_ABBREVIATION,

		// Public base URL used for CORS/origin and link generation.
		// When running behind a reverse proxy (nginx) that terminates TLS,
		// set APP_PUBLIC_URL / APP_PUBLIC_SECURE and keep the Node server itself HTTP.
		url: process.env.APP_PUBLIC_URL || process.env.APP_URL,

        keywords: [ 'jackpot', 'coinflip', 'csgo', 'cs', 'go', 'global', 'offensive', 'cs:go', 'vgo', 'csgocoinflip', 'csgocoinflip', 'csgosite', 'vgocoinflip', 'vgocoinflip', 'vgosite', 'site', 'vgokingdom', 'kingdom', 'bet', 'gambling', 'gamble', 'fair', 'best', 'great', 'csgoempire', 'csgoatse', 'csgo500', 'crypto', 'btc', 'eth', 'roulette', 'experience' ],
        autor: 'MrCHICK',
        description: process.env.APP_NAME + ' - The best crypto place to win money!',
        themecolor: '#9370db',

        social: {
            steam_group: process.env.STEAM_GROUP_URL,
            twitter_page: process.env.TWITTER_PAGE_URL
        },

		port: process.env.APP_PORT,

		// Public-facing "is the site HTTPS?" flag (what users see).
		secure: (process.env.APP_PUBLIC_SECURE ?? process.env.APP_SECURE) === 'true',

		// Whether the Node server itself should listen with HTTPS.
		// Defaults to the public secure mode for backward compatibility.
		listen_secure: (process.env.APP_LISTEN_SECURE ?? (process.env.APP_PUBLIC_SECURE ?? process.env.APP_SECURE)) === 'true',

        ssl: {
            cert: process.env.SSL_CRT_FILE,
            key: process.env.SSL_KEY_FILE
        },

		database: {
			database: process.env.DB_DATABASE,
			host: process.env.DB_HOST,
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
			user: process.env.DB_USERNAME,
			password: process.env.DB_PASSWORD
		},

        ipinfo: {
            api_token: process.env.IPINFO_API_TOKEN
        },

        google: {
            client: process.env.GOOGLE_CLIENT_ID,
            secret: process.env.GOOGLE_CLIENT_SECRET,
            callback_url: process.env.GOOGLE_CALLBACK_URL
        },

        discord: {
            client: process.env.DISCORD_CLIENT_ID,
            secret: process.env.DISCORD_CLIENT_SECRET,
            callback_url: process.env.DISCORD_CALLBACK_URL
        },

        steam: {
            apikey: process.env.STEAM_API_KEY,
            callback_url: process.env.STEAM_CALLBACK_URL
        },

		mailer: {
			host: process.env.MAIL_HOST,
			port: process.env.MAIL_PORT,
			secure: process.env.MAIL_SECURE === 'true',
			email: process.env.MAIL_EMAIL,
			password: process.env.MAIL_PASSWORD
		},

		recaptcha: {
			private_key: process.env.RECAPTCHA_PRIVATE_KEY,
			public_key: process.env.RECAPTCHA_PUBLIC_KEY
		},

        pages: {
            'crash': 'Crash',
            'coinflip': 'Coinflip',
            'blackjack': 'Blackjack',
            'minesweeper': 'Minesweeper',
            'tower': 'Tower',
            'casino': 'Casino',
            'account': 'Account',
            'user': 'User',
            'rewards': 'Rewards',
            'deposit': 'Deposit',
            'withdraw': 'Withdraw',
            'tos': 'Terms Of Service',
            'support': 'Support',
            'fair': 'Provably Fair',
            'faq': 'Frequently Asked Questions',
            'maintenance': 'Maintenance',
            'leaderboard': 'Leaderboard',
            'banned': 'Banned',
            'home': 'Home',
            'admin': 'Admin',
            'dashboard': 'Dashboard',
            'affiliates': 'Affiliates',
            'login': 'Sign In',
            'register': 'Create Account',
            'setPassword': 'Set Your Password',
            'setEmail': 'Set Your Email',
            'forgotPassword': 'Forgot Password',
            'resetPassword': 'Reset Your Password',
            'twofa': 'Two-Factory Authentication',
            'authorize': 'Verification Authentication'
        },

		access_secrets: [ 'admin' ],

        permissions: {
            exclude_ban_ip: [ 'owner' ],
            exclude_ban_site: [ 'owner' ],
            exclude_ban_play: [ 'owner' ],
            exclude_ban_trade: [ 'owner' ],
            exclude_mute: [ 'owner' ],
            exclude_chat_pause: [ 'owner', 'admin', 'moderator' ],
            access_maintenance: [ 'owner', 'developer', 'admin', 'moderator', 'helper' ],
            create_bonus: [ 'owner', 'admin' ],
            play_offline: [ 'owner' ],
            play_disabled: [ 'owner' ],
            play_casino_real: [ 'owner' ],
            trade_offline: [ 'owner' ],
            trade_disabled: [ 'owner' ],
            withdraw: [ 'owner' ],
            view_user: [ 'owner', 'admin' ],
            call_gamebots: [ 'owner' ],
            extended_session: [ 'owner', 'admin', 'moderator' ]
        },

        ranks: {
            0: 'member', 1: 'admin', 2: 'moderator', 3: 'helper', 4: 'veteran', 5: 'pro', 6: 'youtuber', 7: 'streamer', 8: 'developer', 100: 'owner',
            'member': 0, 'admin': 1, 'moderator': 2, 'helper': 3, 'veteran': 4, 'pro': 5, 'youtuber': 6, 'streamer': 7, 'developer': 8, 'owner': 100
        },

		flood: {
			time: 100 * 10e5, // IN NANO SECONDS
			count: 5
		},

		level: {
			start: 500,
			next: 0.235
		},

        tip: {
            level_send: 5,
            level_receive: 5
        },

		rain: {
			start: 1.00,
			cooldown_start: 5 * 60,
			timeout_interval: { min: 10 * 60, max: 30 * 60 }
		},

        intervals: {
            amounts: {
                crash: { min: 0.01, max: 1000.00 },
                coinflip: { min: 0.01, max: 1000.00 },
                blackjack: { min: 0.01, max: 1000.00 },
                minesweeper: { min: 0.01, max: 1000.00 },
                tower: { min: 0.01, max: 1000.00 },

                tip_player: { min: 0.01, max: 100.00 },
                tip_rain: { min: 0.01, max: 1000.00 },

                deposit_crypto: { min: 2.00, max: 500.00 },
                withdraw_crypto: { min: 2.00, max: 500.00 }

            }

        },

		rewards: {
            amounts: {
                steam: 0.50,
                google: 0.50,
                discord: 0.50,
                facebook: 0.50,

                refferal_code: 1.00,

                daily_start: 0.20,
                daily_level: 0.02
            },

            requirements: {
                code_length: { min: 6, max: 20 },
                bonus_uses: { min: 1, max: 500 },
                bonus_amount: { min: 0.01, max: 10.00 }
            },

            daily: {
                amount: 5.00,
                time: 7 * 24 * 60 * 60
            }
		},

        affiliates: {
            requirements: [0.00, 200.00, 500.00, 750.00, 1000.00, 2000.00, 3500.00, 5000.00, 7500.00, 10000.00],
            commissions: {
                deposit: 1,
                bet: 2
            }
        },

		admin: {

            gamebots_requirements: {
				name_length: { min: 4, max: 20 }
			},

            tracking_links: {
                code_length: 64,
                usage_length: { min: 4, max: 20 }
            },

            deposit_bonuses: {
                code_length: { min: 6, max: 12 }
            }
		},

        support: {
            requirements: {
                subject_length: { min: 6, max: 100 },
                message_length: { min: 10, max: 2000 }
            }
        },

		chat: {
			max_messages: 40,

			cooldown_massage: 1,

			channels: ['en', 'ro', 'fr', 'ru', 'de'],

			support: {
				active: false,
				message: 'If you find bugs contact us as soon as possible to solve them! With all due respect, the ' + process.env.APP_ABBREVIATION + ' team.',
				cooldown: 24 * 60 * 60
			},

			greeting: {
				active: true,
				message: 'Please contact us if you need help. We don\'t resolve issues in the chat. Type /help for chat commands. With all due respect, the ' + process.env.APP_ABBREVIATION + ' team.'
			},

			message_double_xp: 'Weekly Double XP! Get double XP betting on our games until Sunday at 23:59PM GTM.'
		},

        auth: {
            expire: {
                token: {
                    authentication: 2 * 60 * 60,
                    recover: 2 * 60 * 60,
                    email_validation: 10 * 60
                },
                code: {
                    twofa: 10 * 60,
                    email_verification: 10 * 60
                },
                sessions: {
                    security: 15 * 60
                }
            },
            session: {
                expire: {
                    normal: 1 * 24 * 60 * 60,
                    extended: 30 * 24 * 60 * 60
                }
            }
        },

		pagination: {
			items: {
			}
		}
	},

    trading: {
		deposit_bonus: 5,

        withdraw_requirements: {
            deposit: {
                amount: 1.00,
                time: -1 // time in seconds or -1 for all-time
            }
        },

        crypto: {
			nowpayments: {
				api_key: process.env.NOWPAYMENTS_API_KEY,
				public_key: process.env.NOWPAYMENTS_PUBLIC_KEY,

                email: process.env.NOWPAYMENTS_EMAIL,
                password: process.env.NOWPAYMENTS_PASSWORD,

                ipn_secret_key: process.env.NOWPAYMENTS_IPN_SECRET_KEY,
                twofa_secret_key: process.env.NOWPAYMENTS_TWOFA_SECRET_KEY,

                callback_url: process.env.NOWPAYMENTS_CALLBACK_URL
			},

			currencies: {
				cooldown_load: 1
			}
		}

	},

	games: {
		history: {
			big_bets: 100.00
		},

		winning_to_chat: 50000.00,

		eos_future: 10,

		games: {

            crash: {
				multiplayer: true,
				timer: 5,
				max_profit: 5000.00,
				instant_chance: 5
			},

            coinflip: {
				multiplayer: true,
				cancel: false,
				timer_cancel: 1 * 60 * 60,
				timer_wait_start: 3,
				timer_delete: 1 * 60
			},

            blackjack: {
                multiplayer: false
            },

            minesweeper: {
				multiplayer: false
			},

            tower: {
				multiplayer: false,
				multipliers: {
					easy: [1.31, 1.74, 2.32, 3.10, 4.13, 5.51, 7.34, 9.79, 13.05],
					medium: [1.47, 2.21, 3.31, 4.96, 7.44, 11.16, 16.74, 25.11, 37.67],
					hard: [1.96, 3.92, 7.84, 15.68, 31.36, 62.72, 125.44, 250.88, 501.76],
					expert: [2.94, 8.82, 26.46, 79.38, 238,14, 714.42, 2143.26, 6429.78, 19289.34],
					master: [3.92, 15.68, 62.72, 250.88, 1003.52, 4014.08, 16056.32, 64225.28, 256901.12]
				},
				tiles: {
					easy: {
                        total: 4,
                        correct: 3
                    },
					medium: {
                        total: 3,
                        correct: 2
                    },
					hard: {
                        total: 2,
                        correct: 1
                    },
					expert: {
                        total: 3,
                        correct: 1
                    },
					master: {
                        total: 4,
                        correct: 1
                    }
				}
			},

            casino: {
                multiplayer: false,

                drakon: {
                    agent: {
                        code: process.env.DRAKON_AGENT_CODE,
                        token: process.env.DRAKON_AGENT_TOKEN,
                        secret_key: process.env.DRAKON_AGENT_SECRET_KEY,
                        currency: process.env.DRAKON_AGENT_CURRENCY
                    },
                    language: process.env.DRAKON_LANGUAGE
                },

                access_token: {
                    cooldown_load: 10 * 60
                },

                games: {
                    cooldown_load: 1 * 60 * 60
                }
            }
		}
	}
}

module.exports = config;