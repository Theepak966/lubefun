function userAvatar(edata) {
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
  , __lines = "<div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 2
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 3
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 5
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 6
    ; __append( item )
    ; __append("\n    ")
    ; __line = 7
    ;  }); 
    ; __append("\n</div>")
    ; __line = 8
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}