var SMTPTransport = require('nodemailer/lib/smtp-transport');
var nodemailer = require('nodemailer');

var { loggerError } = require('@/lib/logger');

var config = require('@/config/config.js');

var transporter = nodemailer.createTransport(new SMTPTransport({
	host: config.app.mailer.host,
    port: parseInt(config.app.mailer.port),
    secure: config.app.mailer.secure,
	auth: {
		user: config.app.mailer.email,
		pass: config.app.mailer.password
	}
}));

function sendMail(to, subject, message, callback){
	var options = {
		from: config.app.mailer.email,
		to: to,
		subject: subject,
		text: message
	};

	transporter.sendMail(options, function(err1, info){
		if(err1) {
            loggerError(err1);

            return callback(new Error('An error occurred while sending mail (1)'));
        }

		callback(null, info);
	});
}

module.exports = {
	sendMail
};