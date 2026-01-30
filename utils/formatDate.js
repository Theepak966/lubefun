function makeDate(date){
	var months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

	var type_time = (date.getHours() < 12) ? 'AM' : 'PM';

	return '0'.concat(date.getDate().toString()).slice(-2) + ' ' + months[date.getMonth()] + ' ' + date.getFullYear() + ', ' + ('0'.concat((date.getHours() % 12).toString()).slice(-2)) + ':' + ('0'.concat(date.getMinutes().toString()).slice(-2)) + ' ' + type_time;
}

function dateFormat(date, format){
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var minutes = date.getMinutes();
	var seconds = date.getSeconds();
	var milliseconds = date.getMilliseconds();

	month = '0'.concat(month).slice(-2);
	day = '0'.concat(day).slice(-2);
	hour = '0'.concat(hour).slice(-2);
	minutes = '0'.concat(minutes).slice(-2);
	seconds = '0'.concat(seconds).slice(-2);
	milliseconds = '00'.concat(milliseconds).slice(-3);

	format = format.replace('sss', milliseconds);
	format = format.replace('ss', seconds);
	format = format.replace('mm', minutes);
	format = format.replace('hh', hour);
	format = format.replace('dd', day);
	format = format.replace('MM', month);
	format = format.replace('yyyy', year);

	return format;
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

function getTimeString(string){
	var time_restriction = 0;

	if(string == 'permanent'){
		time_restriction = -1;
	} else {
		var reg = /^([0-9]*)([a-zA-Z]*)/.exec(string);

		if(reg[2] == 'minutes') time_restriction = time() + parseInt(reg[1]) * 60;
		else if(reg[2] == 'hours') time_restriction = time() + parseInt(reg[1]) * 60 * 60;
		else if(reg[2] == 'days') time_restriction = time() + parseInt(reg[1]) * 60 * 60 * 24;
		else if(reg[2] == 'months') time_restriction = time() + parseInt(reg[1]) * 60 * 60 * 24 * 30;
		else if(reg[2] == 'years') time_restriction = time() + parseInt(reg[1]) * 60 * 60 * 24 * 30 * 12;
	}

	return time_restriction;
}

function getSteamTime(time){
    var date = new Date(time * 1000);

    var year = date.getUTCFullYear();
    var month = date.getUTCMonth();
    var day = date.getUTCDate();

    var timestamp = Math.floor(Date.UTC(year, month, day, 7, 0, 0) / 1000);

    if(timestamp < time) timestamp += 24 * 60 * 60;

    return timestamp;
}

function time() {
	return Math.floor(Date.now() / 1000);
}

module.exports = {
	makeDate, dateFormat, getFormatSeconds, getTimeString, getSteamTime, time
};