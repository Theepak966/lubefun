function roundedToFixed(number, decimals){
	if(isNaN(Number(number))) return 0;

	number = Number((Number(number).toFixed(5)));

	var number_string = number.toString();
	var decimals_string = 0;

	if(number_string.split('.')[1] !== undefined) decimals_string = number_string.split('.')[1].length;

	while(decimals_string - decimals > 0) {
		number_string = number_string.slice(0, -1);

		decimals_string--;
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

function verifyFormatAmount(amount, callback){
	if(isNaN(Number(amount))) return callback(new Error('Invalid amount. This field must to be a number'));

	amount = getFormatAmount(amount);

	return callback(null, amount);
}

module.exports = {
	roundedToFixed, getFormatAmount, getFormatAmountString, splitAmountCumulative, verifyFormatAmount
};