function liveHistory(edata) {
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
  , __lines = "<div class=\"table-row\">\n    <div class=\"table-column text-left\">\n        <div class=\"flex items-center gap-1\">\n            <% with ({ user, size: 'small', classes: [], features: [] }) { %><div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div><% } %>\n\n            <div class=\"text-left w-full truncate\"><%= user.name %></div>\n        </div>\n    </div>\n    <div class=\"table-column text-left font-bold capitalize\"><%= game %></div>\n    <div class=\"table-column text-left\">\n        <div class=\"flex flex-row items-center justify-start gap-1\">\n            <div class=\"coin main\"></div>\n            <span><%= amount %></span>\n        </div>\n    </div>\n    <div class=\"table-column text-left\"><%= multiplier %>x</div>\n\n    <% if(winning > 0) { %>\n        <div class=\"table-column text-right success\">\n            <div class=\"flex flex-row items-center justify-end gap-1\">\n                <div class=\"coin main\"></div>\n                <span>+<%= winning %></span>\n            </div>\n        </div>\n    <% } else { %>\n        <div class=\"table-column text-right\">\n            <div class=\"flex flex-row items-center justify-end gap-1\">\n                <div class=\"coin main\"></div>\n                <span><%= winning %></span>\n            </div>\n        </div>\n    <% } %>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"table-row\">\n    <div class=\"table-column text-left\">\n        <div class=\"flex items-center gap-1\">\n            ")
    ; __line = 4
    ;  with ({ user, size: 'small', classes: [], features: [] }) { 
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 5
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 6
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 8
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 9
    ; __append( item )
    ; __append("\n    ")
    ; __line = 10
    ;  }); 
    ; __append("\n</div>")
    ; __line = 11
    ;  } 
    ; __append("\n\n            <div class=\"text-left w-full truncate\">")
    ; __line = 13
    ; __append(escapeFn( user.name ))
    ; __append("</div>\n        </div>\n    </div>\n    <div class=\"table-column text-left font-bold capitalize\">")
    ; __line = 16
    ; __append(escapeFn( game ))
    ; __append("</div>\n    <div class=\"table-column text-left\">\n        <div class=\"flex flex-row items-center justify-start gap-1\">\n            <div class=\"coin main\"></div>\n            <span>")
    ; __line = 20
    ; __append(escapeFn( amount ))
    ; __append("</span>\n        </div>\n    </div>\n    <div class=\"table-column text-left\">")
    ; __line = 23
    ; __append(escapeFn( multiplier ))
    ; __append("x</div>\n\n    ")
    ; __line = 25
    ;  if(winning > 0) { 
    ; __append("\n        <div class=\"table-column text-right success\">\n            <div class=\"flex flex-row items-center justify-end gap-1\">\n                <div class=\"coin main\"></div>\n                <span>+")
    ; __line = 29
    ; __append(escapeFn( winning ))
    ; __append("</span>\n            </div>\n        </div>\n    ")
    ; __line = 32
    ;  } else { 
    ; __append("\n        <div class=\"table-column text-right\">\n            <div class=\"flex flex-row items-center justify-end gap-1\">\n                <div class=\"coin main\"></div>\n                <span>")
    ; __line = 36
    ; __append(escapeFn( winning ))
    ; __append("</span>\n            </div>\n        </div>\n    ")
    ; __line = 39
    ;  } 
    ; __append("\n</div>")
    ; __line = 40
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}