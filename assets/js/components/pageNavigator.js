function pageNavigator(edata) {
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
  , __lines = "<div class=\"pagination-content flex flex-row gap-2\" id=\"<%= id %>\" data-page=\"<%= page %>\">\n    <div class=\"pagination-item flex items-center justify-center\" data-page=\"1\">«</div>\n\n    <div class=\"flex flex-row gap-1\">\n        <% var imin = page - 3; %>\n        <% var imax = page + 3; %>\n\n        <% var min = Math.max(1, imin - (imax > pages ? imax - pages : 0)); %>\n        <% var max = Math.min(pages, imax + (imin < 1 ? 1 - imin : 0)); %>\n\n        <% for(var i = min; i <= max; i++){ %>\n            <div class=\"pagination-item flex items-center justify-center <% if(page == i) { %>active<% } %>\" data-page=\"<%= i %>\"><%= i %></div>\n        <% } %>\n    </div>\n\n    <div class=\"pagination-item flex items-center justify-center\" data-page=\"<%= pages %>\">»</div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"pagination-content flex flex-row gap-2\" id=\"")
    ; __append(escapeFn( id ))
    ; __append("\" data-page=\"")
    ; __append(escapeFn( page ))
    ; __append("\">\n    <div class=\"pagination-item flex items-center justify-center\" data-page=\"1\">«</div>\n\n    <div class=\"flex flex-row gap-1\">\n        ")
    ; __line = 5
    ;  var imin = page - 3; 
    ; __append("\n        ")
    ; __line = 6
    ;  var imax = page + 3; 
    ; __append("\n\n        ")
    ; __line = 8
    ;  var min = Math.max(1, imin - (imax > pages ? imax - pages : 0)); 
    ; __append("\n        ")
    ; __line = 9
    ;  var max = Math.min(pages, imax + (imin < 1 ? 1 - imin : 0)); 
    ; __append("\n\n        ")
    ; __line = 11
    ;  for(var i = min; i <= max; i++){ 
    ; __append("\n            <div class=\"pagination-item flex items-center justify-center ")
    ; __line = 12
    ;  if(page == i) { 
    ; __append("active")
    ;  } 
    ; __append("\" data-page=\"")
    ; __append(escapeFn( i ))
    ; __append("\">")
    ; __append(escapeFn( i ))
    ; __append("</div>\n        ")
    ; __line = 13
    ;  } 
    ; __append("\n    </div>\n\n    <div class=\"pagination-item flex items-center justify-center\" data-page=\"")
    ; __line = 16
    ; __append(escapeFn( pages ))
    ; __append("\">»</div>\n</div>")
    ; __line = 17
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}