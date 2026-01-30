function betAmount(edata) {
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
  , __lines = "<div class=\"input_field transition duration-500\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"text\" class=\"betamount field_element_input\" id=\"betamount_<%= game %>\" data-game=\"<%= game %>\" data-amount=\"<%= game %>\" value=\"<%= amount %>\">\n\n            <div class=\"field_label transition duration-500\">\n                <div class=\"flex flex-row items-center justify-center gap-1\">\n                    <div class=\"coin main\"></div>\n                    <span>Bet Amount</span>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"field_extra\">\n            <% if(actions.includes('clear')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"clear\">Clear</button><% } %>\n            <% if(actions.includes('0.01')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"0.01\">+0.01</button><% } %>\n            <% if(actions.includes('0.10')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"0.10\">+0.10</button><% } %>\n            <% if(actions.includes('1.00')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"1.00\">+1.00</button><% } %>\n            <% if(actions.includes('10.00')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"10.00\">+10.00</button><% } %>\n            <% if(actions.includes('100.00')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"100.00\">+100.00</button><% } %>\n            <% if(actions.includes('half')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"half\">1/2</button><% } %>\n            <% if(actions.includes('double')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"double\">x2</button><% } %>\n            <% if(actions.includes('max')) { %><button class=\"button betshort_action\" data-game=\"<%= game %>\" data-action=\"max\">Max</button><% } %>\n\n            <% features.forEach(function(item){ %>\n                <%- item %>\n            <% }); %>\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        <div class=\"field_error\" data-error=\"required\">This field is required</div>\n        <div class=\"field_error\" data-error=\"number\">This field must be a number</div>\n        <div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div>\n        <div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"input_field transition duration-500\" data-border=\"#de4c41\">\n    <div class=\"field_container\">\n        <div class=\"field_content\">\n            <input type=\"text\" class=\"betamount field_element_input\" id=\"betamount_")
    ; __line = 4
    ; __append(escapeFn( game ))
    ; __append("\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-amount=\"")
    ; __append(escapeFn( game ))
    ; __append("\" value=\"")
    ; __append(escapeFn( amount ))
    ; __append("\">\n\n            <div class=\"field_label transition duration-500\">\n                <div class=\"flex flex-row items-center justify-center gap-1\">\n                    <div class=\"coin main\"></div>\n                    <span>Bet Amount</span>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"field_extra\">\n            ")
    ; __line = 15
    ;  if(actions.includes('clear')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"clear\">Clear</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 16
    ;  if(actions.includes('0.01')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"0.01\">+0.01</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 17
    ;  if(actions.includes('0.10')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"0.10\">+0.10</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 18
    ;  if(actions.includes('1.00')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"1.00\">+1.00</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 19
    ;  if(actions.includes('10.00')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"10.00\">+10.00</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 20
    ;  if(actions.includes('100.00')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"100.00\">+100.00</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 21
    ;  if(actions.includes('half')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"half\">1/2</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 22
    ;  if(actions.includes('double')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"double\">x2</button>")
    ;  } 
    ; __append("\n            ")
    ; __line = 23
    ;  if(actions.includes('max')) { 
    ; __append("<button class=\"button betshort_action\" data-game=\"")
    ; __append(escapeFn( game ))
    ; __append("\" data-action=\"max\">Max</button>")
    ;  } 
    ; __append("\n\n            ")
    ; __line = 25
    ;  features.forEach(function(item){ 
    ; __append("\n                ")
    ; __line = 26
    ; __append( item )
    ; __append("\n            ")
    ; __line = 27
    ;  }); 
    ; __append("\n        </div>\n    </div>\n\n    <div class=\"field_bottom\">\n        <div class=\"field_error\" data-error=\"required\">This field is required</div>\n        <div class=\"field_error\" data-error=\"number\">This field must be a number</div>\n        <div class=\"field_error\" data-error=\"greater\">You must enter a greater value</div>\n        <div class=\"field_error\" data-error=\"lesser\">You must enter a lesser value</div>\n    </div>\n</div>")
    ; __line = 37
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}