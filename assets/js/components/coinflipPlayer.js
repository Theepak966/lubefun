function coinflipPlayer(edata) {
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
  , __lines = "<div class=\"coinflip-player <% if(!winner) { %>active<% } %> w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            <% if(user){ %>\n                <% with ({ user, size: 'large', classes: [], features: [\n                    '<div class=\"level sop-large-left flex justify-center items-center border-2 border-secondary bg-secondary rounded-full\"><img src=\"/img/coinflip/coin' + position + '.png\"></div>'\n                ] }) { %><div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div><% } %>\n\n                <div class=\"text-center w-full truncate\"><%= user.name %></div>\n            <% } else if(joined) { %>\n                <% if(creator) { %>\n                    <div class=\"relative\">\n                        <button class=\"coinflip-callbot button button-primary shadow-2 w-full\" data-id=\"<%= id %>\">Call a Bot</button>\n                        <div class=\"sop-large-left flex justify-center items-center border-2 border-primary bg-secondary rounded-full\"><img src=\"/img/coinflip/coin<%= position %>.png\"></div>\n                    </div>\n                <% } %>\n            <% } else { %>\n                <div class=\"relative\">\n                    <button class=\"coinflip-join button button-primary shadow-2 w-full\" data-id=\"<%= id %>\">Join Game</button>\n                    <div class=\"sop-large-left flex justify-center items-center border-2 border-primary bg-secondary rounded-full\"><img src=\"/img/coinflip/coin<%= position %>.png\"></div>\n                </div>\n            <% } %>\n        </div>\n\n        <div class=\"bg-card rounded-2 border-2 border-card px-2 flex flex-row items-center justify-center gap-1\">\n            <div class=\"coin main\"></div>\n            <span class=\"text-base\"><%= amount %></span>\n        </div>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"coinflip-player ")
    ;  if(!winner) { 
    ; __append("active")
    ;  } 
    ; __append(" w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            ")
    ; __line = 4
    ;  if(user){ 
    ; __append("\n                ")
    ; __line = 5
    ;  with ({ user, size: 'large', classes: [], features: [
                    '<div class="level sop-large-left flex justify-center items-center border-2 border-secondary bg-secondary rounded-full"><img src="/img/coinflip/coin' + position + '.png"></div>'
                ] }) { 
    ; __line = 7
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 8
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 9
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 11
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 12
    ; __append( item )
    ; __append("\n    ")
    ; __line = 13
    ;  }); 
    ; __append("\n</div>")
    ; __line = 14
    ;  } 
    ; __append("\n\n                <div class=\"text-center w-full truncate\">")
    ; __line = 16
    ; __append(escapeFn( user.name ))
    ; __append("</div>\n            ")
    ; __line = 17
    ;  } else if(joined) { 
    ; __append("\n                ")
    ; __line = 18
    ;  if(creator) { 
    ; __append("\n                    <div class=\"relative\">\n                        <button class=\"coinflip-callbot button button-primary shadow-2 w-full\" data-id=\"")
    ; __line = 20
    ; __append(escapeFn( id ))
    ; __append("\">Call a Bot</button>\n                        <div class=\"sop-large-left flex justify-center items-center border-2 border-primary bg-secondary rounded-full\"><img src=\"/img/coinflip/coin")
    ; __line = 21
    ; __append(escapeFn( position ))
    ; __append(".png\"></div>\n                    </div>\n                ")
    ; __line = 23
    ;  } 
    ; __append("\n            ")
    ; __line = 24
    ;  } else { 
    ; __append("\n                <div class=\"relative\">\n                    <button class=\"coinflip-join button button-primary shadow-2 w-full\" data-id=\"")
    ; __line = 26
    ; __append(escapeFn( id ))
    ; __append("\">Join Game</button>\n                    <div class=\"sop-large-left flex justify-center items-center border-2 border-primary bg-secondary rounded-full\"><img src=\"/img/coinflip/coin")
    ; __line = 27
    ; __append(escapeFn( position ))
    ; __append(".png\"></div>\n                </div>\n            ")
    ; __line = 29
    ;  } 
    ; __append("\n        </div>\n\n        <div class=\"bg-card rounded-2 border-2 border-card px-2 flex flex-row items-center justify-center gap-1\">\n            <div class=\"coin main\"></div>\n            <span class=\"text-base\">")
    ; __line = 34
    ; __append(escapeFn( amount ))
    ; __append("</span>\n        </div>\n    </div>\n</div>")
    ; __line = 37
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}