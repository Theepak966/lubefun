//GRAPH
var canvas, ctx;

var crash_settings = {
	start_time: new Date().getTime(),
	current_progress_time: 0,
	difference_time: 0,
	stage: 'starting'
}

var canvas_responsive = 0;

var XTimeBeg, XTimeEnd, YPayoutBeg, YPayoutEnd, XScale, YScale;

var line_weight = 4;

$(window).resize(function(){
	crashGame_resize();
});

$(document).ready(function() {
	canvas = document.getElementById('crash_canvas');

	if(canvas !== null) {
		ctx = canvas.getContext('2d');

		crashGame_resize();

		setInterval(function(){
			var marks_size = 14;

			Object.assign(ctx, {
				fillStyle : '#ffffff',
				font: 'bold ' + marks_size + 'px Roboto,sans-serif',
				lineWidth: 2
			});

			var current_time = getTime();

			var currentGrowth = 100 * growthFunc(current_time);
			var currentPayout = 100 * calcPayout(current_time);

			var offset_bottom = canvas_responsive ? 60 : 30;
			var offset_left = 0;

			var offset_right = canvas_responsive ? 50 : 0;

			var text_bottom = canvas_responsive ? 40 : 20;
			var text_right = canvas_responsive ? 15 : 0;

			XTimeBeg = 0;
			XTimeEnd = Math.max(10000, current_time);
			YPayoutBeg = 100;
			YPayoutEnd = Math.max(180, currentGrowth);
			XScale = (canvas.width - offset_left - offset_right) / (XTimeEnd - XTimeBeg);
			YScale = (canvas.height - offset_bottom) / (YPayoutEnd - YPayoutBeg);

			ctx.beginPath();

			// Clear canvas - fully transparent to show background animations
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			//DRAW AXES (hidden/minimal)
			var payoutSeparation = tickSeparation((canvas_responsive ? 60 : 30) / YScale);
			var timeSeparation = tickSeparation((canvas_responsive ? 80 : 40) / XScale);

			// Hide axes for clean look - only show when needed
			// Axes removed for minimal design

			if(crash_settings.stage != 'crashed') $('#crash_crash').text(calcPayout(current_time).toFixed(2));

			if(crash_settings.stage == 'progress' || crash_settings.stage == 'crashed'){
				// Smooth curved trajectory line with glow
				var multiplier = calcPayout(current_time);
				var glowIntensity = Math.min(multiplier / 5, 1); // Glow increases with multiplier
				
				ctx.beginPath();
				
				// Main trajectory line - smooth curve
				var gradient = ctx.createLinearGradient(
					calcX(XTimeBeg, 1) + offset_left, 
					calcY(100 * calcPayout(XTimeBeg)) + canvas.height - offset_bottom,
					calcX(current_time, 1) + offset_left,
					calcY(100 * calcPayout(current_time)) + canvas.height - offset_bottom
				);
				
				// Color adapts with multiplier
				var baseColor = crash_settings.stage == 'crashed' ? 
					{ r: 239, g: 68, b: 68 } : 
					{ r: 34, g: 197, b: 94 };
				
				gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`);
				gradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`);
				
				ctx.strokeStyle = gradient;
				ctx.lineWidth = 3;
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				
				// Smooth curve using quadratic bezier
				var prevX = calcX(XTimeBeg, 1) + offset_left;
				var prevY = calcY(100 * calcPayout(XTimeBeg)) + canvas.height - offset_bottom;
				ctx.moveTo(prevX, prevY);
				
				for (var t = XTimeBeg + 50; t < current_time; t += 50) {
					var t1 = Math.floor(t / 50) * 50;
					var x = calcX(t1, 1) + offset_left;
					var y = calcY(100 * calcPayout(t1)) + canvas.height - offset_bottom;
					
					// Smooth curve
					var midX = (prevX + x) / 2;
					var midY = (prevY + y) / 2;
					ctx.quadraticCurveTo(prevX, prevY, midX, midY);
					
					prevX = x;
					prevY = y;
				}
				
				var x_current = calcX(current_time, 1) + offset_left;
				var y_current = calcY(100 * calcPayout(current_time)) + canvas.height - offset_bottom;
				ctx.quadraticCurveTo(prevX, prevY, x_current, y_current);
				ctx.stroke();
				
				// Glow trail effect
				ctx.shadowBlur = 15 * glowIntensity;
				ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`;
				ctx.stroke();
				ctx.shadowBlur = 0;
				
				// Current position indicator with glow
				if(current_time > 0 && crash_settings.stage == 'progress'){
					ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 1)`;
					
					// Outer glow circle
					ctx.beginPath();
					ctx.arc(x_current, y_current, 8, 0, 2 * Math.PI, false);
					ctx.shadowBlur = 20 * glowIntensity;
					ctx.shadowColor = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`;
					ctx.fill();
					ctx.shadowBlur = 0;
					
					// Inner dot
					ctx.beginPath();
					ctx.arc(x_current, y_current, 4, 0, 2 * Math.PI, false);
					ctx.fill();
				}
			}

			ctx.closePath();
		}, 10);
	}
});

function calcX(time, g) {
	return (XScale - canvas.width * 0.15 / (XTimeEnd - XTimeBeg) * g) * (time - XTimeBeg);
};

function calcY(payout) {
	return -(YScale * (payout - YPayoutBeg));
};

function getTime(){
	if(crash_settings.stage == 'progress') {
		var time = new Date().getTime() - crash_settings.start_time + crash_settings.difference_time;
		crash_settings.current_progress_time = time;

		return time;
	}

	if(crash_settings.stage == 'crashed') return crash_settings.current_progress_time;
	return 0;
}

function calcPayout(ms) {
	var gamePayout = growthFunc(ms);
	return gamePayout;
}

function growthFunc(ms) {
	var r = 0.00006;
	return Math.pow(Math.E, r * ms);
}

function tickSeparation(s) {
	var r = 1;
	while (true) {
		if (r > s) return r;
		r *= 2;

		if (r > s) return r;
		r *= 5
	}
}