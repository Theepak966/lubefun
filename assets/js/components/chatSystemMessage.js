function chatSystemMessage(edata) {
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
  , __lines = "<div class=\"chat-message flex flex-col gap-2 relative p-1\" data-message=\"<%= id %>\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        <img class=\"icon-medium rounded-full\" src=\"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg\">\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"chat-message-name chat-link-system truncate\">System</div>\n\n            <div class=\"chat-message-time\"><%= time %></div>\n\n            <%- script %>\n        </div>\n    </div>\n\n    <div class=\"chat-message-content bg-card p-2 rounded-2 chat-link-system\"><%= message %></div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"chat-message flex flex-col gap-2 relative p-1\" data-message=\"")
    ; __append(escapeFn( id ))
    ; __append("\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        <img class=\"icon-medium rounded-full\" src=\"https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg\">\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"chat-message-name chat-link-system truncate\">System</div>\n\n            <div class=\"chat-message-time\">")
    ; __line = 8
    ; __append(escapeFn( time ))
    ; __append("</div>\n\n            ")
    ; __line = 10
    ; __append( script )
    ; __append("\n        </div>\n    </div>\n\n    <div class=\"chat-message-content bg-card p-2 rounded-2 chat-link-system\">")
    ; __line = 14
    ; __append(escapeFn( message ))
    ; __append("</div>\n</div>")
    ; __line = 15
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}