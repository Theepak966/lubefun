function decodeBase64Url(base64Url) {
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var buffer = Buffer.from(base64, 'base64');

    return buffer.toString('utf8');
}

function decodeJwt(token, callback) {
    if(token == null) return callback(null);

    var parts = token.split('.');
    if(parts.length != 3) return callback(null);

    var payload = JSON.parse(decodeBase64Url(parts[1]));

    return callback(payload);
}

module.exports.jwt = {
    decodeJwt
}