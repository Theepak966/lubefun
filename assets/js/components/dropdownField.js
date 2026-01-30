function dropdownField(edata) {
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
  , __lines = "<div class=\"dropdown_field <%= type %> transition duration-500 <% if(typeof disabled !== 'undefined' && disabled) { %>disabled<% } %>\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"text\" class=\"field_element_input <% if(typeof classes !== 'undefined' && Array.isArray(classes)){ %><%= classes.join(' ') %><% } %>\" <% if(typeof id !== 'undefined') { %>id=\"<%= id %>\"<% } %> <% if(typeof attributes !== 'undefined' && Array.isArray(attributes)){ %><%- attributes.map(a => a.name + '=\"' + a.value + '\"').join(' ') %><% } %> value=\"<% if(typeof items !== 'undefined' && Array.isArray(items)){ %><% if(typeof selected !== 'undefined' && selected < items.length){ %><%- items[selected].value %><% } else { %><%- items[0].value %><% } %><% } %>\">\n            <div class=\"field_dropdown\"><% if(typeof items !== 'undefined' && Array.isArray(items)){ %><% if(typeof selected !== 'undefined' && selected < items.length){ %><%- items[selected].name %><% } else { %><%- items[0].name %><% } %><% } %></div>\n\n            <div class=\"field_element_dropdowns\">\n                <% if(typeof items !== 'undefined' && Array.isArray(items)){ %>\n                    <% items.forEach(function(item, index){ %>\n                        <div class=\"field_element_dropdown\" value=\"<%= item.value %>\" data-index=\"<%= index %>\"><%- item.name %></div>\n                    <% }); %>\n                <% } %>\n            </div>\n\n           <% if(typeof placeholder !== 'undefined'){ %>\n                <div class=\"field_label active transition duration-500\"><%= placeholder %></div>\n            <% } %>\n        </div>\n\n        <div class=\"field_extra\">\n            <div class=\"field_caret\">\n                <i class=\"fa fa-caret-down\" aria-hidden=\"true\"></i>\n            </div>\n        </div>\n    </div>\n\n    <div class=\"field_bottom\"></div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"dropdown_field ")
    ; __append(escapeFn( type ))
    ; __append(" transition duration-500 ")
    ;  if(typeof disabled !== 'undefined' && disabled) { 
    ; __append("disabled")
    ;  } 
    ; __append("\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"text\" class=\"field_element_input ")
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
    ; __append(" value=\"")
    ;  if(typeof items !== 'undefined' && Array.isArray(items)){ 
    ;  if(typeof selected !== 'undefined' && selected < items.length){ 
    ; __append( items[selected].value )
    ;  } else { 
    ; __append( items[0].value )
    ;  } 
    ;  } 
    ; __append("\">\n            <div class=\"field_dropdown\">")
    ; __line = 5
    ;  if(typeof items !== 'undefined' && Array.isArray(items)){ 
    ;  if(typeof selected !== 'undefined' && selected < items.length){ 
    ; __append( items[selected].name )
    ;  } else { 
    ; __append( items[0].name )
    ;  } 
    ;  } 
    ; __append("</div>\n\n            <div class=\"field_element_dropdowns\">\n                ")
    ; __line = 8
    ;  if(typeof items !== 'undefined' && Array.isArray(items)){ 
    ; __append("\n                    ")
    ; __line = 9
    ;  items.forEach(function(item, index){ 
    ; __append("\n                        <div class=\"field_element_dropdown\" value=\"")
    ; __line = 10
    ; __append(escapeFn( item.value ))
    ; __append("\" data-index=\"")
    ; __append(escapeFn( index ))
    ; __append("\">")
    ; __append( item.name )
    ; __append("</div>\n                    ")
    ; __line = 11
    ;  }); 
    ; __append("\n                ")
    ; __line = 12
    ;  } 
    ; __append("\n            </div>\n\n           ")
    ; __line = 15
    ;  if(typeof placeholder !== 'undefined'){ 
    ; __append("\n                <div class=\"field_label active transition duration-500\">")
    ; __line = 16
    ; __append(escapeFn( placeholder ))
    ; __append("</div>\n            ")
    ; __line = 17
    ;  } 
    ; __append("\n        </div>\n\n        <div class=\"field_extra\">\n            <div class=\"field_caret\">\n                <i class=\"fa fa-caret-down\" aria-hidden=\"true\"></i>\n            </div>\n        </div>\n    </div>\n\n    <div class=\"field_bottom\"></div>\n</div>")
    ; __line = 28
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}