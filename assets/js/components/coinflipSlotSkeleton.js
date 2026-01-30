function coinflipSlotSkeleton(edata) {
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
  , __lines = "<div class=\"coinflip-game bg-secondary rounded-2 border-2 border-card\">\n    <div class=\"coinflip_betitem bg-card bg-opacity-50 relative size-full flex justify-between p-2\">\n    <div class=\"coinflip-player w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            <% with ({ type: 'card', size: 'large' }) { %><div class=\"skeleton skeleton-<%= type %> avatar-<%= size %>-box\"></div><% } %>\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n\n        <div class=\"skeleton skeleton-card text-medium-box\"></div>\n    </div>\n</div>\n\n    <div class=\"coinflip-player w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            <% with ({ type: 'card', size: 'large' }) { %><div class=\"skeleton skeleton-<%= type %> avatar-<%= size %>-box\"></div><% } %>\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n\n        <div class=\"skeleton skeleton-card text-medium-box\"></div>\n    </div>\n</div>\n</div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"coinflip-game bg-secondary rounded-2 border-2 border-card\">\n    <div class=\"coinflip_betitem bg-card bg-opacity-50 relative size-full flex justify-between p-2\">\n    <div class=\"coinflip-player w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            ")
    ; __line = 6
    ;  with ({ type: 'card', size: 'large' }) { 
    ; __append("<div class=\"skeleton skeleton-")
    ; __append(escapeFn( type ))
    ; __append(" avatar-")
    ; __append(escapeFn( size ))
    ; __append("-box\"></div>")
    ;  } 
    ; __append("\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n\n        <div class=\"skeleton skeleton-card text-medium-box\"></div>\n    </div>\n</div>\n\n    <div class=\"coinflip-player w-5 h-full bg-secondary rounded-2 p-1\">\n    <div class=\"flex flex-col justify-between items-center h-full\">\n        <div class=\"flex flex-col items-center justify-center size-full gap-2\">\n            ")
    ; __line = 18
    ;  with ({ type: 'card', size: 'large' }) { 
    ; __append("<div class=\"skeleton skeleton-")
    ; __append(escapeFn( type ))
    ; __append(" avatar-")
    ; __append(escapeFn( size ))
    ; __append("-box\"></div>")
    ;  } 
    ; __append("\n\n            <div class=\"skeleton skeleton-card text-medium-box\"></div>\n        </div>\n\n        <div class=\"skeleton skeleton-card text-medium-box\"></div>\n    </div>\n</div>\n</div>\n</div>")
    ; __line = 27
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}