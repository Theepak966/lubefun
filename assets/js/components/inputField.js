function inputField(edata) {
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
  , __lines = "<div class=\"input_field transition duration-500 <% if(typeof disabled !== 'undefined' && disabled) { %>disabled<% } %>\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input <% if(typeof type !== 'undefined'){ %>type=\"<%= type %>\"<% } %> class=\"field_element_input <% if(typeof classes !== 'undefined' && Array.isArray(classes)){ %><%= classes.join(' ') %><% } %>\" <% if(typeof id !== 'undefined') { %>id=\"<%= id %>\"<% } %> <% if(typeof attributes !== 'undefined' && Array.isArray(attributes)){ %><%- attributes.map(a => a.name + '=\"' + a.value + '\"').join(' ') %><% } %> <% if(typeof value !== 'undefined') { %>value=\"<%= value %>\"<% } %> <% if(typeof readonly !== 'undefined' && readonly) { %>readonly<% } %>>\n\n            <% if(typeof currency !== 'undefined'){ %>\n                <div class=\"field_label transition duration-500\">\n                    <div class=\"flex flex-row items-center justify-center gap-1\">\n                        <div class=\"coin <%= currency %>\"></div>\n                        <% if(typeof placeholder !== 'undefined'){ %><span><%= placeholder %></span><% } %>\n                    </div>\n                </div>\n            <% } else { %>\n                <% if(typeof placeholder !== 'undefined'){ %><div class=\"field_label transition duration-500\"><%= placeholder %></div><% } %>\n            <% } %>\n        </div>\n\n        <div class=\"field_extra\">\n            <% if(typeof features !== 'undefined' && Array.isArray(features)){ %>\n                <% features.forEach(function(item){ %>\n                    <%- item %>\n                <% }); %>\n            <% } %>\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        <% if(typeof errors !== 'undefined' && Array.isArray(errors)){ %>\n            <% if(errors.includes('required')) { %><div class=\"field_error\" data-error=\"required\">This field is required</div><% } %>\n            <% if(errors.includes('number')) { %><div class=\"field_error\" data-error=\"number\">This field must be a number</div><% } %>\n            <% if(errors.includes('percentage')) { %><div class=\"field_error\" data-error=\"percentage\">This field must be a percentage</div><% } %>\n            <% if(errors.includes('greater')) { %><div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div><% } %>\n            <% if(errors.includes('lesser')) { %><div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div><% } %>\n            <% if(errors.includes('positive_integer')) { %><div class=\"field_error\" data-error=\"positive_integer\">This field must be a positive integer number</div><% } %>\n            <% if(errors.includes('minimum_6_characters')) { %><div class=\"field_error\" data-error=\"minimum_6_characters\">This field must be a text with minimum 6 characters</div><% } %>\n            <% if(errors.includes('minimum_10_characters')) { %><div class=\"field_error\" data-error=\"minimum_10_characters\">This field must be a text with minimum 10 characters</div><% } %>\n            <% if(errors.includes('only_letters_numbers')) { %><div class=\"field_error\" data-error=\"only_letters_numbers\">This field must contain only letters and numbers</div><% } %>\n            <% if(errors.includes('password')) { %><div class=\"field_error\" data-error=\"password\">At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol</div><% } %>\n            <% if(errors.includes('email')) { %><div class=\"field_error\" data-error=\"email\">This field must be a email</div><% } %>\n            <% if(errors.includes('name')) { %><div class=\"field_error\" data-error=\"name\">At least 2 characters, maximum 64 characters</div><% } %>\n        <% } %>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"input_field transition duration-500 ")
    ;  if(typeof disabled !== 'undefined' && disabled) { 
    ; __append("disabled")
    ;  } 
    ; __append("\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input ")
    ; __line = 4
    ;  if(typeof type !== 'undefined'){ 
    ; __append("type=\"")
    ; __append(escapeFn( type ))
    ; __append("\"")
    ;  } 
    ; __append(" class=\"field_element_input ")
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
    ;  if(typeof value !== 'undefined') { 
    ; __append("value=\"")
    ; __append(escapeFn( value ))
    ; __append("\"")
    ;  } 
    ; __append(" ")
    ;  if(typeof readonly !== 'undefined' && readonly) { 
    ; __append("readonly")
    ;  } 
    ; __append(">\n\n            ")
    ; __line = 6
    ;  if(typeof currency !== 'undefined'){ 
    ; __append("\n                <div class=\"field_label transition duration-500\">\n                    <div class=\"flex flex-row items-center justify-center gap-1\">\n                        <div class=\"coin ")
    ; __line = 9
    ; __append(escapeFn( currency ))
    ; __append("\"></div>\n                        ")
    ; __line = 10
    ;  if(typeof placeholder !== 'undefined'){ 
    ; __append("<span>")
    ; __append(escapeFn( placeholder ))
    ; __append("</span>")
    ;  } 
    ; __append("\n                    </div>\n                </div>\n            ")
    ; __line = 13
    ;  } else { 
    ; __append("\n                ")
    ; __line = 14
    ;  if(typeof placeholder !== 'undefined'){ 
    ; __append("<div class=\"field_label transition duration-500\">")
    ; __append(escapeFn( placeholder ))
    ; __append("</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 15
    ;  } 
    ; __append("\n        </div>\n\n        <div class=\"field_extra\">\n            ")
    ; __line = 19
    ;  if(typeof features !== 'undefined' && Array.isArray(features)){ 
    ; __append("\n                ")
    ; __line = 20
    ;  features.forEach(function(item){ 
    ; __append("\n                    ")
    ; __line = 21
    ; __append( item )
    ; __append("\n                ")
    ; __line = 22
    ;  }); 
    ; __append("\n            ")
    ; __line = 23
    ;  } 
    ; __append("\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        ")
    ; __line = 28
    ;  if(typeof errors !== 'undefined' && Array.isArray(errors)){ 
    ; __append("\n            ")
    ; __line = 29
    ;  if(errors.includes('required')) { 
    ; __append("<div class=\"field_error\" data-error=\"required\">This field is required</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 30
    ;  if(errors.includes('number')) { 
    ; __append("<div class=\"field_error\" data-error=\"number\">This field must be a number</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 31
    ;  if(errors.includes('percentage')) { 
    ; __append("<div class=\"field_error\" data-error=\"percentage\">This field must be a percentage</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 32
    ;  if(errors.includes('greater')) { 
    ; __append("<div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 33
    ;  if(errors.includes('lesser')) { 
    ; __append("<div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 34
    ;  if(errors.includes('positive_integer')) { 
    ; __append("<div class=\"field_error\" data-error=\"positive_integer\">This field must be a positive integer number</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 35
    ;  if(errors.includes('minimum_6_characters')) { 
    ; __append("<div class=\"field_error\" data-error=\"minimum_6_characters\">This field must be a text with minimum 6 characters</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 36
    ;  if(errors.includes('minimum_10_characters')) { 
    ; __append("<div class=\"field_error\" data-error=\"minimum_10_characters\">This field must be a text with minimum 10 characters</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 37
    ;  if(errors.includes('only_letters_numbers')) { 
    ; __append("<div class=\"field_error\" data-error=\"only_letters_numbers\">This field must contain only letters and numbers</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 38
    ;  if(errors.includes('password')) { 
    ; __append("<div class=\"field_error\" data-error=\"password\">At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 39
    ;  if(errors.includes('email')) { 
    ; __append("<div class=\"field_error\" data-error=\"email\">This field must be a email</div>")
    ;  } 
    ; __append("\n            ")
    ; __line = 40
    ;  if(errors.includes('name')) { 
    ; __append("<div class=\"field_error\" data-error=\"name\">At least 2 characters, maximum 64 characters</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 41
    ;  } 
    ; __append("\n    </div>\n</div>")
    ; __line = 43
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}