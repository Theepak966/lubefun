function textareaField(edata) {
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
  , __lines = "<div class=\"input_field transition duration-500 <% if(typeof disabled !== 'undefined' && disabled) { %>disabled<% } %>\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <textarea class=\"field_element_input <%= classes.join(' ') %>\" <% if(id) { %>id=\"<%= id %>\"<% } %> <%- attributes.map(a => a.name + '=\"' + a.value + '\"').join(' ') %> value=\"<%= value %>\" <% if(readonly) { %>readonly<% } %>></textarea>\n\n            <div class=\"field_label transition duration-500\"><%= name %></div>\n        </div>\n\n        <div class=\"field_extra\">\n            <% features.forEach(function(item){ %>\n                <%- item %>\n            <% }); %>\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        <% if(errors.includes('required')) { %><div class=\"field_error\" data-error=\"required\">This field is required</div><% } %>\n        <% if(errors.includes('number')) { %><div class=\"field_error\" data-error=\"number\">This field must be a number</div><% } %>\n        <% if(errors.includes('percentage')) { %><div class=\"field_error\" data-error=\"percentage\">This field must be a percentage</div><% } %>\n        <% if(errors.includes('greater')) { %><div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div><% } %>\n        <% if(errors.includes('lesser')) { %><div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div><% } %>\n        <% if(errors.includes('positive_integer')) { %><div class=\"field_error\" data-error=\"positive_integer\">This field must be a positive integer number</div><% } %>\n        <% if(errors.includes('minimum_6_characters')) { %><div class=\"field_error\" data-error=\"minimum_6_characters\">This field must be a text with minimum 6 characters</div><% } %>\n        <% if(errors.includes('minimum_10_characters')) { %><div class=\"field_error\" data-error=\"minimum_10_characters\">This field must be a text with minimum 10 characters</div><% } %>\n\t\t<% if(errors.includes('only_letters_numbers')) { %><div class=\"field_error\" data-error=\"only_letters_numbers\">This field must contain only letters and numbers</div><% } %>\n\t\t<% if(errors.includes('password')) { %><div class=\"field_error\" data-error=\"password\">At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol</div><% } %>\n    \t<% if(errors.includes('email')) { %><div class=\"field_error\" data-error=\"email\">This field must be a email</div><% } %>\n    \t<% if(errors.includes('name')) { %><div class=\"field_error\" data-error=\"name\">At least 2 characters, maximum 64 characters</div><% } %>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"input_field transition duration-500 ")
    ;  if(typeof disabled !== 'undefined' && disabled) { 
    ; __append("disabled")
    ;  } 
    ; __append("\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <textarea class=\"field_element_input ")
    ; __line = 4
    ; __append(escapeFn( classes.join(' ') ))
    ; __append("\" ")
    ;  if(id) { 
    ; __append("id=\"")
    ; __append(escapeFn( id ))
    ; __append("\"")
    ;  } 
    ; __append(" ")
    ; __append( attributes.map(a => a.name + '="' + a.value + '"').join(' ') )
    ; __append(" value=\"")
    ; __append(escapeFn( value ))
    ; __append("\" ")
    ;  if(readonly) { 
    ; __append("readonly")
    ;  } 
    ; __append("></textarea>\n\n            <div class=\"field_label transition duration-500\">")
    ; __line = 6
    ; __append(escapeFn( name ))
    ; __append("</div>\n        </div>\n\n        <div class=\"field_extra\">\n            ")
    ; __line = 10
    ;  features.forEach(function(item){ 
    ; __append("\n                ")
    ; __line = 11
    ; __append( item )
    ; __append("\n            ")
    ; __line = 12
    ;  }); 
    ; __append("\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        ")
    ; __line = 17
    ;  if(errors.includes('required')) { 
    ; __append("<div class=\"field_error\" data-error=\"required\">This field is required</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 18
    ;  if(errors.includes('number')) { 
    ; __append("<div class=\"field_error\" data-error=\"number\">This field must be a number</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 19
    ;  if(errors.includes('percentage')) { 
    ; __append("<div class=\"field_error\" data-error=\"percentage\">This field must be a percentage</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 20
    ;  if(errors.includes('greater')) { 
    ; __append("<div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 21
    ;  if(errors.includes('lesser')) { 
    ; __append("<div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 22
    ;  if(errors.includes('positive_integer')) { 
    ; __append("<div class=\"field_error\" data-error=\"positive_integer\">This field must be a positive integer number</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 23
    ;  if(errors.includes('minimum_6_characters')) { 
    ; __append("<div class=\"field_error\" data-error=\"minimum_6_characters\">This field must be a text with minimum 6 characters</div>")
    ;  } 
    ; __append("\n        ")
    ; __line = 24
    ;  if(errors.includes('minimum_10_characters')) { 
    ; __append("<div class=\"field_error\" data-error=\"minimum_10_characters\">This field must be a text with minimum 10 characters</div>")
    ;  } 
    ; __append("\n		")
    ; __line = 25
    ;  if(errors.includes('only_letters_numbers')) { 
    ; __append("<div class=\"field_error\" data-error=\"only_letters_numbers\">This field must contain only letters and numbers</div>")
    ;  } 
    ; __append("\n		")
    ; __line = 26
    ;  if(errors.includes('password')) { 
    ; __append("<div class=\"field_error\" data-error=\"password\">At least 8 characters, maximum 64 characters, one uppercase, one lowercase, one number and one symbol</div>")
    ;  } 
    ; __append("\n    	")
    ; __line = 27
    ;  if(errors.includes('email')) { 
    ; __append("<div class=\"field_error\" data-error=\"email\">This field must be a email</div>")
    ;  } 
    ; __append("\n    	")
    ; __line = 28
    ;  if(errors.includes('name')) { 
    ; __append("<div class=\"field_error\" data-error=\"name\">At least 2 characters, maximum 64 characters</div>")
    ;  } 
    ; __append("\n    </div>\n</div>")
    ; __line = 30
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}