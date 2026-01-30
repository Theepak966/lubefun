function crashGraph(edata) {
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
  , __lines = "<div class=\"crash-graph flex flex-col\" id=\"crash_graph\">\n    <canvas id=\"crash_canvas\"></canvas>\n\n    <div class=\"crash-messages\">\n        <div class=\"crash-message starting\">\n            <div>Next round starting...</div>\n            <div class=\"font-bold\"><span id=\"crash_timer\">5.00</span>s</div>\n        </div>\n        <div class=\"crash-message progress\">\n            <div>Current Multiplier</div>\n            <div><span id=\"crash_crash\">1.00</span>x</div>\n        </div>\n    </div>\n\n    <script type=\"text/javascript\" src=\"/js/graph.js\"></script>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"crash-graph flex flex-col\" id=\"crash_graph\">\n    <canvas id=\"crash_canvas\"></canvas>\n\n    <div class=\"crash-messages\">\n        <div class=\"crash-message starting\">\n            <div>Next round starting...</div>\n            <div class=\"font-bold\"><span id=\"crash_timer\">5.00</span>s</div>\n        </div>\n        <div class=\"crash-message progress\">\n            <div>Current Multiplier</div>\n            <div><span id=\"crash_crash\">1.00</span>x</div>\n        </div>\n    </div>\n\n    <script type=\"text/javascript\" src=\"/js/graph.js\"></script>\n</div>")
    ; __line = 16
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}