function chatMessageSkeleton(edata) {
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
  , __lines = "<div class=\"chat-message flex flex-col gap-2 relative p-1\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        <% with ({ type: 'card', size: 'medium' }) { %><div class=\"skeleton skeleton-<%= type %> avatar-<%= size %>-box\"></div><% } %>\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"flex flex-row gap-4 justify-between items-center\">\n                <div class=\"skeleton skeleton-card text-large-box\"></div>\n\n                <div class=\"skeleton skeleton-card text-small-box\"></div>\n            </div>\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n    </div>\n\n    <div class=\"skeleton skeleton-card chat-message-box\"></div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"chat-message flex flex-col gap-2 relative p-1\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        ")
    ; __line = 3
    ;  with ({ type: 'card', size: 'medium' }) { 
    ; __append("<div class=\"skeleton skeleton-")
    ; __append(escapeFn( type ))
    ; __append(" avatar-")
    ; __append(escapeFn( size ))
    ; __append("-box\"></div>")
    ;  } 
    ; __append("\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"flex flex-row gap-4 justify-between items-center\">\n                <div class=\"skeleton skeleton-card text-large-box\"></div>\n\n                <div class=\"skeleton skeleton-card text-small-box\"></div>\n            </div>\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n    </div>\n\n    <div class=\"skeleton skeleton-card chat-message-box\"></div>\n</div>")
    ; __line = 17
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}