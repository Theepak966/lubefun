function slotCard(edata) {
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
  , __lines = "<div class=\"slot-card <% if(!enable){ %>disabled<% } %>\" data-id=\"<%= id %>\">\r\n    <div class=\"slot-card-image\">\r\n        <img src=\"<%= image %>\" alt=\"<%= name %>\">\r\n        <% if(enable){ %>\r\n            <div class=\"slot-card-overlay\">\r\n                <a href=\"/casino/slots/<%= id %>\" class=\"slot-card-play-btn\">\r\n                    <i class=\"fa fa-play\" aria-hidden=\"true\"></i>\r\n                    <span>Play</span>\r\n                </a>\r\n            </div>\r\n        <% } %>\r\n    </div>\r\n    \r\n    <div class=\"slot-card-info\">\r\n        <div class=\"slot-card-name\"><%= name %></div>\r\n        <div class=\"slot-card-provider\"><%= provider %></div>\r\n    </div>\r\n</div>\r\n"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"slot-card ")
    ;  if(!enable){ 
    ; __append("disabled")
    ;  } 
    ; __append("\" data-id=\"")
    ; __append(escapeFn( id ))
    ; __append("\">\r\n    <div class=\"slot-card-image\">\r\n        <img src=\"")
    ; __line = 3
    ; __append(escapeFn( image ))
    ; __append("\" alt=\"")
    ; __append(escapeFn( name ))
    ; __append("\">\r\n        ")
    ; __line = 4
    ;  if(enable){ 
    ; __append("\r\n            <div class=\"slot-card-overlay\">\r\n                <a href=\"/casino/slots/")
    ; __line = 6
    ; __append(escapeFn( id ))
    ; __append("\" class=\"slot-card-play-btn\">\r\n                    <i class=\"fa fa-play\" aria-hidden=\"true\"></i>\r\n                    <span>Play</span>\r\n                </a>\r\n            </div>\r\n        ")
    ; __line = 11
    ;  } 
    ; __append("\r\n    </div>\r\n    \r\n    <div class=\"slot-card-info\">\r\n        <div class=\"slot-card-name\">")
    ; __line = 15
    ; __append(escapeFn( name ))
    ; __append("</div>\r\n        <div class=\"slot-card-provider\">")
    ; __line = 16
    ; __append(escapeFn( provider ))
    ; __append("</div>\r\n    </div>\r\n</div>\r\n")
    ; __line = 19
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}