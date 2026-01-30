function coinflipBet(edata) {
    function anonymous(locals, escapeFn, include, rethrow
) {
rethrow = rethrow || function rethrow(err, str, flnm, lineno, esc) {
  var lines = str.split('\n');
  var start = Math.max(lineno - 3, 0);
  var end = Math.min(lines.length, lineno + 3);
  var filename = esc(flnm);
  // Error context
  var context = lines.slice(start, end).map(function (line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'ejs') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
};
escapeFn = escapeFn || function (markup) {
  return markup == undefined
    ? ''
    : String(markup)
      .replace(_MATCH_HTML, encode_char);
};
var _ENCODE_HTML_RULES = {
      "&": "&amp;"
    , "<": "&lt;"
    , ">": "&gt;"
    , '"': "&#34;"
    , "'": "&#39;"
    }
  , _MATCH_HTML = /[&<>'"]/g;
function encode_char(c) {
  return _ENCODE_HTML_RULES[c] || c;
};
;
var __line = 1
  , __lines = "<div class=\"coinflip-card <% if(status == 0) { %>coinflip-joinable<% } else if(status == 1 || status == 2 || status == 3) { %>coinflip-inplay<% } else if(status == 4) { %>coinflip-finished<% } %>\" data-id=\"<%= id %>\" <% if(isBotFlip === true) { %>data-isBotFlip=\"true\"<% } %>>\n\t<!-- Left: Player 1 -->\n\t<div class=\"coinflip-card-left flex flex-row items-center gap-3\">\n\t\t<% var player1 = players.find(a => a.position == 0); %>\n\t\t<% if(player1 && player1.user) { %>\n\t\t\t<% with ({ user: player1.user, size: 'small', classes: [], features: [] }) { %><div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div><% } %>\n\t\t\t<div class=\"flex flex-col gap-1\">\n\t\t\t\t<div class=\"coinflip-player-name\">\n\t\t\t\t\t<%= player1.user.name %>\n\t\t\t\t\t<% if(player1.bot == 1) { %><span class=\"coinflip-bot-badge\">BOT</span><% } %>\n\t\t\t\t</div>\n\t\t\t\t<% if(creator && player1.user.userid == creator) { %>\n\t\t\t\t\t<div class=\"coinflip-creator-badge\">Creator</div>\n\t\t\t\t<% } %>\n\t\t\t</div>\n\t\t<% } else { %>\n\t\t\t<div class=\"coinflip-empty-slot\">Waiting...</div>\n\t\t<% } %>\n\t</div>\n\n\t<!-- Center: VS / Status -->\n\t<div class=\"coinflip-card-center flex flex-col items-center justify-center gap-2\">\n\t\t<% if(status == 0) { %>\n\t\t\t<div class=\"coinflip-vs-icon\">VS</div>\n\t\t\t<div class=\"coinflip-status-badge coinflip-status-joinable\">Joinable</div>\n\t\t<% } else if(status == 1) { %>\n\t\t\t<div class=\"coinflip-timer-circle\">\n\t\t\t\t<div class=\"coinflip-timer-text\" id=\"coinflip_timer_<%= id %>\"><%= data.time %></div>\n\t\t\t</div>\n\t\t\t<div class=\"coinflip-status-badge coinflip-status-inplay\">In Play</div>\n\t\t\t<% var script = '<script>' +\n\t\t\t\t'var coinflip_timer_' + id + ' = ' + data.time + ';' +\n\t\t\t\t'if(coinflip_interval_' + id + ') clearInterval(coinflip_interval_' + id + ');' +\n\t\t\t\t'var coinflip_interval_' + id + ' = setInterval(function(){' +\n\t\t\t\t\t'coinflip_timer_' + id + '--;' +\n\t\t\t\t\t'$(\"#coinflip_timer_' + id + '\").text(coinflip_timer_' + id + ');' +\n\t\t\t\t\t'if(coinflip_timer_' + id + ' <= 0) clearInterval(coinflip_interval_' + id + ');' +\n\t\t\t\t'}, 1000);' +\n\t\t\t'</script>'; %>\n\t\t\t<%- script %>\n\t\t<% } else if(status == 2) { %>\n\t\t\t<div class=\"coinflip-status-badge coinflip-status-inplay\">EOS</div>\n\t\t<% } else if(status == 3) { %>\n\t\t\t<div class=\"coinflip-coin coinflip-coin-animation-<%= data.winner %>\">\n\t\t\t\t<div class=\"front absolute top-0 bottom-0 left-0 right-0\"></div>\n\t\t\t\t<div class=\"back absolute top-0 bottom-0 left-0 right-0\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"coinflip-status-badge coinflip-status-inplay\">Flipping</div>\n\t\t<% } else if(status == 4) { %>\n\t\t\t<div class=\"coinflip-result-icon coinflip-result-<%= data.winner %>\">\n\t\t\t\t<img src=\"/img/coinflip/coin<%= data.winner %>.png\">\n\t\t\t</div>\n\t\t\t<div class=\"coinflip-status-badge coinflip-status-finished\">Finished</div>\n\t\t<% } %>\n\t</div>\n\n\t<!-- Right: Player 2 / Amount / Action -->\n\t<div class=\"coinflip-card-right flex flex-row items-center gap-4\">\n\t\t<div class=\"coinflip-amount flex flex-col items-end gap-1\">\n\t\t\t<div class=\"flex flex-row items-center gap-2\">\n\t\t\t\t<div class=\"coin main\"></div>\n\t\t\t\t<span class=\"coinflip-amount-value\"><%= amount %></span>\n\t\t\t</div>\n\t\t\t<% if(isBotFlip === true) { %>\n\t\t\t\t<div class=\"coinflip-simulated-label\">Simulated</div>\n\t\t\t<% } %>\n\t\t</div>\n\n\t\t<% if(status == 0) { %>\n\t\t\t<% if(isBotFlip === true) { %>\n\t\t\t\t<div class=\"coinflip-bot-only-text\">Bots Only</div>\n\t\t\t<% } else { %>\n\t\t\t\t<button class=\"coinflip-join-btn coinflip-join\" data-id=\"<%= id %>\">Join</button>\n\t\t\t<% } %>\n\t\t<% } else if(status == 1 || status == 2 || status == 3) { %>\n\t\t\t<div class=\"coinflip-player-2 flex flex-row items-center gap-2\">\n\t\t\t\t<% var player2 = players.find(a => a.position == 1); %>\n\t\t\t\t<% if(player2 && player2.user) { %>\n\t\t\t\t\t<% with ({ user: player2.user, size: 'small', classes: [], features: [] }) { %><div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div><% } %>\n\t\t\t\t\t<div class=\"coinflip-player-name\">\n\t\t\t\t\t\t<%= player2.user.name %>\n\t\t\t\t\t\t<% if(player2.bot == 1) { %><span class=\"coinflip-bot-badge\">BOT</span><% } %>\n\t\t\t\t\t</div>\n\t\t\t\t<% } %>\n\t\t\t</div>\n\t\t<% } else if(status == 4) { %>\n\t\t\t<div class=\"coinflip-result-text\">\n\t\t\t\t<% var winner = players.find(a => a.position == data.winner); %>\n\t\t\t\t<% if(winner && winner.user) { %>\n\t\t\t\t\t<%= winner.user.name %> won\n\t\t\t\t<% } %>\n\t\t\t</div>\n\t\t<% } %>\n\t</div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"coinflip-card ")
    ;  if(status == 0) { 
    ; __append("coinflip-joinable")
    ;  } else if(status == 1 || status == 2 || status == 3) { 
    ; __append("coinflip-inplay")
    ;  } else if(status == 4) { 
    ; __append("coinflip-finished")
    ;  } 
    ; __append("\" data-id=\"")
    ; __append(escapeFn( id ))
    ; __append("\" ")
    ;  if(isBotFlip === true) { 
    ; __append("data-isBotFlip=\"true\"")
    ;  } 
    ; __append(">\n	<!-- Left: Player 1 -->\n	<div class=\"coinflip-card-left flex flex-row items-center gap-3\">\n		")
    ; __line = 4
    ;  var player1 = players.find(a => a.position == 0); 
    ; __append("\n		")
    ; __line = 5
    ;  if(player1 && player1.user) { 
    ; __append("\n			")
    ; __line = 6
    ;  with ({ user: player1.user, size: 'small', classes: [], features: [] }) { 
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 7
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 8
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 10
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 11
    ; __append( item )
    ; __append("\n    ")
    ; __line = 12
    ;  }); 
    ; __append("\n</div>")
    ; __line = 13
    ;  } 
    ; __append("\n			<div class=\"flex flex-col gap-1\">\n				<div class=\"coinflip-player-name\">\n					")
    ; __line = 16
    ; __append(escapeFn( player1.user.name ))
    ; __append("\n					")
    ; __line = 17
    ;  if(player1.bot == 1) { 
    ; __append("<span class=\"coinflip-bot-badge\">BOT</span>")
    ;  } 
    ; __append("\n				</div>\n				")
    ; __line = 19
    ;  if(creator && player1.user.userid == creator) { 
    ; __append("\n					<div class=\"coinflip-creator-badge\">Creator</div>\n				")
    ; __line = 21
    ;  } 
    ; __append("\n			</div>\n		")
    ; __line = 23
    ;  } else { 
    ; __append("\n			<div class=\"coinflip-empty-slot\">Waiting...</div>\n		")
    ; __line = 25
    ;  } 
    ; __append("\n	</div>\n\n	<!-- Center: VS / Status -->\n	<div class=\"coinflip-card-center flex flex-col items-center justify-center gap-2\">\n		")
    ; __line = 30
    ;  if(status == 0) { 
    ; __append("\n			<div class=\"coinflip-vs-icon\">VS</div>\n			<div class=\"coinflip-status-badge coinflip-status-joinable\">Joinable</div>\n		")
    ; __line = 33
    ;  } else if(status == 1) { 
    ; __append("\n			<div class=\"coinflip-timer-circle\">\n				<div class=\"coinflip-timer-text\" id=\"coinflip_timer_")
    ; __line = 35
    ; __append(escapeFn( id ))
    ; __append("\">")
    ; __append(escapeFn( data.time ))
    ; __append("</div>\n			</div>\n			<div class=\"coinflip-status-badge coinflip-status-inplay\">In Play</div>\n			")
    ; __line = 38
    ;  var script = '<script>' +
				'var coinflip_timer_' + id + ' = ' + data.time + ';' +
				'if(coinflip_interval_' + id + ') clearInterval(coinflip_interval_' + id + ');' +
				'var coinflip_interval_' + id + ' = setInterval(function(){' +
					'coinflip_timer_' + id + '--;' +
					'$("#coinflip_timer_' + id + '").text(coinflip_timer_' + id + ');' +
					'if(coinflip_timer_' + id + ' <= 0) clearInterval(coinflip_interval_' + id + ');' +
				'}, 1000);' +
			'</script>'; 
    ; __line = 46
    ; __append("\n			")
    ; __line = 47
    ; __append( script )
    ; __append("\n		")
    ; __line = 48
    ;  } else if(status == 2) { 
    ; __append("\n			<div class=\"coinflip-status-badge coinflip-status-inplay\">EOS</div>\n		")
    ; __line = 50
    ;  } else if(status == 3) { 
    ; __append("\n			<div class=\"coinflip-coin coinflip-coin-animation-")
    ; __line = 51
    ; __append(escapeFn( data.winner ))
    ; __append("\">\n				<div class=\"front absolute top-0 bottom-0 left-0 right-0\"></div>\n				<div class=\"back absolute top-0 bottom-0 left-0 right-0\"></div>\n			</div>\n			<div class=\"coinflip-status-badge coinflip-status-inplay\">Flipping</div>\n		")
    ; __line = 56
    ;  } else if(status == 4) { 
    ; __append("\n			<div class=\"coinflip-result-icon coinflip-result-")
    ; __line = 57
    ; __append(escapeFn( data.winner ))
    ; __append("\">\n				<img src=\"/img/coinflip/coin")
    ; __line = 58
    ; __append(escapeFn( data.winner ))
    ; __append(".png\">\n			</div>\n			<div class=\"coinflip-status-badge coinflip-status-finished\">Finished</div>\n		")
    ; __line = 61
    ;  } 
    ; __append("\n	</div>\n\n	<!-- Right: Player 2 / Amount / Action -->\n	<div class=\"coinflip-card-right flex flex-row items-center gap-4\">\n		<div class=\"coinflip-amount flex flex-col items-end gap-1\">\n			<div class=\"flex flex-row items-center gap-2\">\n				<div class=\"coin main\"></div>\n				<span class=\"coinflip-amount-value\">")
    ; __line = 69
    ; __append(escapeFn( amount ))
    ; __append("</span>\n			</div>\n			")
    ; __line = 71
    ;  if(isBotFlip === true) { 
    ; __append("\n				<div class=\"coinflip-simulated-label\">Simulated</div>\n			")
    ; __line = 73
    ;  } 
    ; __append("\n		</div>\n\n		")
    ; __line = 76
    ;  if(status == 0) { 
    ; __append("\n			")
    ; __line = 77
    ;  if(isBotFlip === true) { 
    ; __append("\n				<div class=\"coinflip-bot-only-text\">Bots Only</div>\n			")
    ; __line = 79
    ;  } else { 
    ; __append("\n				<button class=\"coinflip-join-btn coinflip-join\" data-id=\"")
    ; __line = 80
    ; __append(escapeFn( id ))
    ; __append("\">Join</button>\n			")
    ; __line = 81
    ;  } 
    ; __append("\n		")
    ; __line = 82
    ;  } else if(status == 1 || status == 2 || status == 3) { 
    ; __append("\n			<div class=\"coinflip-player-2 flex flex-row items-center gap-2\">\n				")
    ; __line = 84
    ;  var player2 = players.find(a => a.position == 1); 
    ; __append("\n				")
    ; __line = 85
    ;  if(player2 && player2.user) { 
    ; __append("\n					")
    ; __line = 86
    ;  with ({ user: player2.user, size: 'small', classes: [], features: [] }) { 
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 87
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 88
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 90
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 91
    ; __append( item )
    ; __append("\n    ")
    ; __line = 92
    ;  }); 
    ; __append("\n</div>")
    ; __line = 93
    ;  } 
    ; __append("\n					<div class=\"coinflip-player-name\">\n						")
    ; __line = 95
    ; __append(escapeFn( player2.user.name ))
    ; __append("\n						")
    ; __line = 96
    ;  if(player2.bot == 1) { 
    ; __append("<span class=\"coinflip-bot-badge\">BOT</span>")
    ;  } 
    ; __append("\n					</div>\n				")
    ; __line = 98
    ;  } 
    ; __append("\n			</div>\n		")
    ; __line = 100
    ;  } else if(status == 4) { 
    ; __append("\n			<div class=\"coinflip-result-text\">\n				")
    ; __line = 102
    ;  var winner = players.find(a => a.position == data.winner); 
    ; __append("\n				")
    ; __line = 103
    ;  if(winner && winner.user) { 
    ; __append("\n					")
    ; __line = 104
    ; __append(escapeFn( winner.user.name ))
    ; __append(" won\n				")
    ; __line = 105
    ;  } 
    ; __append("\n			</div>\n		")
    ; __line = 107
    ;  } 
    ; __append("\n	</div>\n</div>")
    ; __line = 109
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}