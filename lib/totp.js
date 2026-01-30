var crypto = require('crypto');

var Base32 = {
    encode: function(buffer) {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

        var bits = 0;
        var value = 0;
        var output = '';

        for (var i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;

            while (bits >= 5) {
                output += alphabet[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }

        if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];

        return output;
    },

    decode: function(input) {
        var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

        var bits = 0;
        var value = 0;
        var output = [];

        for (var i = 0; i < input.length; i++) {
            var index = alphabet.indexOf(input[i].toUpperCase());
            if (index === -1) continue;

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }

        return Buffer.from(output);
    }
};

function generateSecret(length) {
    var randomBytes = crypto.randomBytes(length);
    return Base32.encode(randomBytes);
}

function generateToken(secret){
    var timeStep = 30;
    var digits = 6;

    var epoch = Math.floor(Date.now() / 1000);
    var counter = Math.floor(epoch / timeStep);
    var hmac = hmacSHA1(secret, counter);

    return truncate(hmac, digits);
}

function verifyToken(secret, token){
    var timeStep = 30;
    var window = 1;
    var digits = 6;

    var epoch = Math.floor(Date.now() / 1000);
    var counter = Math.floor(epoch / timeStep);

    for (var i = -window; i <= window; i++) {
        var generatedToken = truncate(hmacSHA1(secret, counter + i), digits);

        if(generatedToken === token) return true;
    }

    return false;
}

function hmacSHA1(secret, counter){
    var buffer = Buffer.alloc(8);
    for(var i = 7; i >= 0; i--) {
        buffer[i] = counter & 0xff;
        counter >>= 8;
    }

    var key = Base32.decode(secret);
    return crypto.createHmac("sha1", key).update(buffer).digest();
}

function truncate(hmac, digits){
    var offset = hmac[hmac.length - 1] & 0xf;
    var binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);

    return (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
}

function generateUrl(userid, secret, issuer) {
    return 'otpauth://totp/'+ userid +'?secret=' + secret + '&issuer=' + issuer + '&algorithm=SHA1&digits=6&period=30';
}

module.exports.totp = {
    generateSecret, generateToken, verifyToken, generateUrl
};