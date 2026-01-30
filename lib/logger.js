var log4js = require('log4js');
var fs = require('fs');

var { dateFormat } = require('@/utils/formatDate.js')

var logger = log4js.getLogger();

function initializeLogs() {
	var date = dateFormat(new Date(), 'dd.MM.yyyy');

	log4js.configure({
		appenders: {
			out: { type: 'console' },
			app: { type: 'file', filename: 'logs/' + date + '.log' }
		},
		categories: {
			default: { appenders: [ 'out', 'app' ], level: 'all' }
		}
	});

	setTimeout(function(){
		initializeLogs();
	}, 24 * 3600 * 1000);
}

function writeError(error){
	var date = dateFormat(new Date(), 'dd-MM-yyyyThh:mm:ss.sss').replace(/:/g, '-');

	try{
		error = error.stack.toString();
	} catch(e) {
		error = error.toString();
	}

	// Ensure errors directory exists
	var errorsDir = 'errors';
	if (!fs.existsSync(errorsDir)) {
		fs.mkdirSync(errorsDir, { recursive: true });
	}

	fs.writeFile(errorsDir + '/' + date + '.error', error, function(err1){
		if(err1) return logger.error(err1);

		
	});
}

function loggerInfo(message){
	logger.info(message);
}

function loggerDebug(message){
	logger.debug(message);
}

function loggerTrace(message){
	logger.trace(message);
}

function loggerWarn(message){
	logger.warn(message);
}

function loggerError(message){
	logger.error(message);

	writeError(message);
}

function loggerFatal(message){
	logger.fatal(message);

	writeError(message);
}

module.exports = {
	initializeLogs,
	loggerInfo, loggerDebug, loggerTrace, loggerWarn, loggerError, loggerFatal
};