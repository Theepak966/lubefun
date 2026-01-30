function switchField(edata) {
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
  , __lines = "<div class=\"switch_field transition duration-500 <% if(typeof disabled !== 'undefined' && disabled) { %>disabled<% } %>\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"checkbox\" class=\"field_element_input <% if(typeof classes !== 'undefined' && Array.isArray(classes)){ %><%= classes.join(' ') %><% } %>\" <% if(typeof id !== 'undefined') { %>id=\"<%= id %>\"<% } %> <% if(typeof attributes !== 'undefined' && Array.isArray(attributes)){ %><%- attributes.map(a => a.name + '=\"' + a.value + '\"').join(' ') %><% } %> <% if(typeof checked !== 'undefined' && checked) { %>checked<% } %>>\n\n            <div class=\"field_switch\">\n                <div class=\"field_switch_bar\"></div>\n            </div>\n\n            <% if(typeof placeholder !== 'undefined'){ %><div class=\"field_label active transition duration-500\"><%= placeholder %></div><% } %>\n        </div>\n\n        <div class=\"field_extra\"></div>\n    </div>\n\n    <div class=\"field_bottom\"></div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"switch_field transition duration-500 ")
    ;  if(typeof disabled !== 'undefined' && disabled) { 
    ; __append("disabled")
    ;  } 
    ; __append("\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"checkbox\" class=\"field_element_input ")
    ; __line = 4
    ;  if(typeof classes !== 'undefined' && Array.isArray(classes)){ 
    ; __append(escapeFn( classes.join(' ') ))
    ;  } 
    ; __append("\" ")
    ;  if(typeof id !== 'undefined') { 
    ; __append("id=\"")
    ; __append(escapeFn( id ))
    ; __append("\"")
    ;  } 
    ; __append(" ")
    ;  if(typeof attributes !== 'undefined' && Array.isArray(attributes)){ 
    ; __append( attributes.map(a => a.name + '="' + a.value + '"').join(' ') )
    ;  } 
    ; __append(" ")
    ;  if(typeof checked !== 'undefined' && checked) { 
    ; __append("checked")
    ;  } 
    ; __append(">\n\n            <div class=\"field_switch\">\n                <div class=\"field_switch_bar\"></div>\n            </div>\n\n            ")
    ; __line = 10
    ;  if(typeof placeholder !== 'undefined'){ 
    ; __append("<div class=\"field_label active transition duration-500\">")
    ; __append(escapeFn( placeholder ))
    ; __append("</div>")
    ;  } 
    ; __append("\n        </div>\n\n        <div class=\"field_extra\"></div>\n    </div>\n\n    <div class=\"field_bottom\"></div>\n</div>")
    ; __line = 17
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}