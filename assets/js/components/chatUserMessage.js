function chatUserMessage(edata) {
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
  , __lines = "<div class=\"chat-message flex flex-col gap-2 relative p-1 chat-content-<%= { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] %>\" data-message=\"<%= id %>\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        <% with ({ user, size: 'medium', classes: [], features: [] }) { %><div class=\"avatar-field rounded-full <%= classes.join(' ') %> <%= [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] %> relative\">\n    <img class=\"avatar icon-<%= size %> rounded-full\" src=\"<%= user.avatar %>\">\n    <div class=\"level sup-<%= size %>-left flex justify-center items-center border-2 border-secondary rounded-full\"><%= user.level %></div>\n\n    <% features.forEach(function(item){ %>\n        <%- item %>\n    <% }); %>\n</div><% } %>\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"flex flex-row gap-4 justify-between items-center\">\n                <div class=\"chat-message-name chat-link-<%= { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] %> truncate\">\n                    <% if(rank != 0) { %>\n                        <div class=\"chat-message-rank mr-1 rounded-1 chat-rank-<%= { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] %>\"><%= { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] %></div>\n                    <% } %>\n\n                    <%= user.name %>\n                </div>\n\n                <div class=\"chat-message-open-menu text-sm text-muted-foreground pointer px-1\"><i class=\"fa fa-ellipsis-h\" aria-hidden=\"true\"></i></div>\n            </div>\n\n            <div class=\"chat-message-time\"><%= time %></div>\n\n            <%- script %>\n        </div>\n\n        <div class=\"chat-message-menu bg-secondary border-2 border-card rounded-2 p-1 flex flex-col hidden transition duration-200\">\n            <div class=\"chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2\">Loading...</div>\n        </div>\n    </div>\n\n    <div class=\"flex flex-col gap-2 bg-card p-2 rounded-2\">\n        <% if(reply != null){ %>\n            <div class=\"chat-reply flex flex-row items-center gap-2\">\n                <i class=\"fa fa-reply\" aria-hidden=\"true\"></i>\n\n                <div class=\"inline-block\">\n                    <img class=\"avatar\" src=\"<%= reply.user.avatar %>\">\n\n                    <span class=\"name\"><%= reply.user.name %></span>\n                    <span class=\"message\"><%- reply.message %></span>\n                </div>\n            </div>\n        <% } %>\n\n        <div class=\"chat-message-content\"><%- message %></div>\n    </div>\n</div>"
  , __filename = undefined;
try {
  var __output = "";
  function __append(s) { if (s !== undefined && s !== null) __output += s }
  with (locals || {}) {
    ; __append("<div class=\"chat-message flex flex-col gap-2 relative p-1 chat-content-")
    ; __append(escapeFn( { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] ))
    ; __append("\" data-message=\"")
    ; __append(escapeFn( id ))
    ; __append("\">\n    <div class=\"flex flex-row items-center gap-1 relative w-full pl-1\">\n        ")
    ; __line = 3
    ;  with ({ user, size: 'medium', classes: [], features: [] }) { 
    ; __append("<div class=\"avatar-field rounded-full ")
    ; __append(escapeFn( classes.join(' ') ))
    ; __append(" ")
    ; __append(escapeFn( [ 'tier-steel', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-diamond' ][Math.floor(user.level / 25)] ))
    ; __append(" relative\">\n    <img class=\"avatar icon-")
    ; __line = 4
    ; __append(escapeFn( size ))
    ; __append(" rounded-full\" src=\"")
    ; __append(escapeFn( user.avatar ))
    ; __append("\">\n    <div class=\"level sup-")
    ; __line = 5
    ; __append(escapeFn( size ))
    ; __append("-left flex justify-center items-center border-2 border-secondary rounded-full\">")
    ; __append(escapeFn( user.level ))
    ; __append("</div>\n\n    ")
    ; __line = 7
    ;  features.forEach(function(item){ 
    ; __append("\n        ")
    ; __line = 8
    ; __append( item )
    ; __append("\n    ")
    ; __line = 9
    ;  }); 
    ; __append("\n</div>")
    ; __line = 10
    ;  } 
    ; __append("\n\n        <div class=\"chat-message-header flex flex-col justify-center gap-1\">\n            <div class=\"flex flex-row gap-4 justify-between items-center\">\n                <div class=\"chat-message-name chat-link-")
    ; __line = 14
    ; __append(escapeFn( { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] ))
    ; __append(" truncate\">\n                    ")
    ; __line = 15
    ;  if(rank != 0) { 
    ; __append("\n                        <div class=\"chat-message-rank mr-1 rounded-1 chat-rank-")
    ; __line = 16
    ; __append(escapeFn( { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] ))
    ; __append("\">")
    ; __append(escapeFn( { '0': 'member', '1': 'admin', '2': 'moderator', '3': 'helper', '4': 'veteran', '5': 'pro', '6': 'youtuber', '7': 'streamer', '8': 'developer', '100': 'owner' }[rank] ))
    ; __append("</div>\n                    ")
    ; __line = 17
    ;  } 
    ; __append("\n\n                    ")
    ; __line = 19
    ; __append(escapeFn( user.name ))
    ; __append("\n                </div>\n\n                <div class=\"chat-message-open-menu text-sm text-muted-foreground pointer px-1\"><i class=\"fa fa-ellipsis-h\" aria-hidden=\"true\"></i></div>\n            </div>\n\n            <div class=\"chat-message-time\">")
    ; __line = 25
    ; __append(escapeFn( time ))
    ; __append("</div>\n\n            ")
    ; __line = 27
    ; __append( script )
    ; __append("\n        </div>\n\n        <div class=\"chat-message-menu bg-secondary border-2 border-card rounded-2 p-1 flex flex-col hidden transition duration-200\">\n            <div class=\"chat-message-menu-item bg-secondary flex flex-row items-center gap-2 p-2 rounded-2\">Loading...</div>\n        </div>\n    </div>\n\n    <div class=\"flex flex-col gap-2 bg-card p-2 rounded-2\">\n        ")
    ; __line = 36
    ;  if(reply != null){ 
    ; __append("\n            <div class=\"chat-reply flex flex-row items-center gap-2\">\n                <i class=\"fa fa-reply\" aria-hidden=\"true\"></i>\n\n                <div class=\"inline-block\">\n                    <img class=\"avatar\" src=\"")
    ; __line = 41
    ; __append(escapeFn( reply.user.avatar ))
    ; __append("\">\n\n                    <span class=\"name\">")
    ; __line = 43
    ; __append(escapeFn( reply.user.name ))
    ; __append("</span>\n                    <span class=\"message\">")
    ; __line = 44
    ; __append( reply.message )
    ; __append("</span>\n                </div>\n            </div>\n        ")
    ; __line = 47
    ;  } 
    ; __append("\n\n        <div class=\"chat-message-content\">")
    ; __line = 49
    ; __append( message )
    ; __append("</div>\n    </div>\n</div>")
    ; __line = 51
  }
  return __output;
} catch (e) {
  rethrow(e, __lines, __filename, __line, escapeFn);
}

}
    return anonymous(edata);
}