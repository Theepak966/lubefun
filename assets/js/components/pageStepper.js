function pageStepper(edata) {
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
  , __lines = "<div class=\"pagination-content flex flex-row gap-2 w-full\" id=\"<%= id %>\" data-page=\"<%= page %>\">\n    <div class=\"flex flex-row gap-2 justify-between items-center w-full\">\n        <div class=\"pagination-item flex items-center justify-center\" data-page=\"<%= Math.max(1, page - 1) %>\">«</div>\n\n        <div class=\"bg-card flex flex-row items-center justify-center border-2 border-card px-2 rounded-2 h-full\"><%= page %>/<%= pages %></div>\n\n        <div class=\"pagination-item flex items-center justify-center\" data-page=\"<%= Math.min(pages, page + 1) %>\">»</div>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"pagination-content flex flex-row gap-2 w-full\" id=\"")
    ; __append(escapeFn( id ))
    ; __append("\" data-page=\"")
    ; __append(escapeFn( page ))
    ; __append("\">\n    <div class=\"flex flex-row gap-2 justify-between items-center w-full\">\n        <div class=\"pagination-item flex items-center justify-center\" data-page=\"")
    ; __line = 3
    ; __append(escapeFn( Math.max(1, page - 1) ))
    ; __append("\">«</div>\n\n        <div class=\"bg-card flex flex-row items-center justify-center border-2 border-card px-2 rounded-2 h-full\">")
    ; __line = 5
    ; __append(escapeFn( page ))
    ; __append("/")
    ; __append(escapeFn( pages ))
    ; __append("</div>\n\n        <div class=\"pagination-item flex items-center justify-center\" data-page=\"")
    ; __line = 7
    ; __append(escapeFn( Math.min(pages, page + 1) ))
    ; __append("\">»</div>\n    </div>\n</div>")
    ; __line = 9
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}