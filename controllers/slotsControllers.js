var { haveRankPermission } = require('@/utils/utils.js');

var casinoService = require('@/services/games/casinoService.js');

var config = require('@/config/config.js');

exports.slots = async (req, res, next) => {
	if(!config.settings.games.games.classic.casino.enable && !haveRankPermission('play_disabled', res.locals.user ? res.locals.user.rank : 0)) return next();

	res.render('slots', {
		page: 'slots',
		name: config.app.pages['slots'] || 'Slots',
		response: {
			slots: {
				games: casinoService.getSlotsGamesList(res.locals.user ? res.locals.user.userid : null)
			}
		}
	});
};
