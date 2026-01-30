function homeGame(edata) {
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
  , __lines = "<div class=\"item transition duration-500 <% if(!enable){ %>disabled<% } %>\">\n    <% if(enable){ %>\n        <div class=\"info bg-secondary bg-opacity-50 transition duration-200\">\n            <div class=\"rtp text-sm font-bold\"><%= rtp %>% RTP</div>\n\n            <div class=\"start flex flex-col gap-2 items-center\">\n                <a href=\"/<%= game %>\"><div class=\"play flex flex-col items-center justify-center transition duration-500\"><i class=\"fa fa-play\" aria-hidden=\"true\"></i></div></a>\n            </div>\n\n            <div class=\"name text-base text-center font-bold truncate\"><%= name %></div>\n        </div>\n    <% } else { %>\n        <div class=\"info bg-secondary bg-opacity-50 transition duration-200\">\n            <div class=\"description text-sm text-center font-bold\">This game is temporary disabled!</div>\n        </div>\n    <% } %>\n\n    <div class=\"name text-base font-bold transition duration-500\"><%= name %></div>\n    <div class=\"description text-xs font-bold transition duration-500\"><%= description %></div>\n\n    <div class=\"image transition duration-500\"><img src=\"<%= image %>\"></div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"item transition duration-500 ")
    ;  if(!enable){ 
    ; __append("disabled")
    ;  } 
    ; __append("\">\n    ")
    ; __line = 2
    ;  if(enable){ 
    ; __append("\n        <div class=\"info bg-secondary bg-opacity-50 transition duration-200\">\n            <div class=\"rtp text-sm font-bold\">")
    ; __line = 4
    ; __append(escapeFn( rtp ))
    ; __append("% RTP</div>\n\n            <div class=\"start flex flex-col gap-2 items-center\">\n                <a href=\"/")
    ; __line = 7
    ; __append(escapeFn( game ))
    ; __append("\"><div class=\"play flex flex-col items-center justify-center transition duration-500\"><i class=\"fa fa-play\" aria-hidden=\"true\"></i></div></a>\n            </div>\n\n            <div class=\"name text-base text-center font-bold truncate\">")
    ; __line = 10
    ; __append(escapeFn( name ))
    ; __append("</div>\n        </div>\n    ")
    ; __line = 12
    ;  } else { 
    ; __append("\n        <div class=\"info bg-secondary bg-opacity-50 transition duration-200\">\n            <div class=\"description text-sm text-center font-bold\">This game is temporary disabled!</div>\n        </div>\n    ")
    ; __line = 16
    ;  } 
    ; __append("\n\n    <div class=\"name text-base font-bold transition duration-500\">")
    ; __line = 18
    ; __append(escapeFn( name ))
    ; __append("</div>\n    <div class=\"description text-xs font-bold transition duration-500\">")
    ; __line = 19
    ; __append(escapeFn( description ))
    ; __append("</div>\n\n    <div class=\"image transition duration-500\"><img src=\"")
    ; __line = 21
    ; __append(escapeFn( image ))
    ; __append("\"></div>\n</div>")
    ; __line = 22
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}