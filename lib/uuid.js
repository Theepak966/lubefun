var crypto = require('crypto');

function uuidv1() {
    var UUID_EPOCH_DIFF = 12219292800000;
    var now = Date.now() + UUID_EPOCH_DIFF;

    var timestamp = Math.floor(now * 10000);
    var timeBuffer = Buffer.alloc(8);
    for (var i = 0; i < 8; i++) {
        timeBuffer[7 - i] = timestamp & 0xff;
        timestamp = timestamp >> 8;
    }

    var timeLow = timeBuffer.readUInt32BE(4);
    var timeMid = timeBuffer.readUInt16BE(2);
    var timeHi = timeBuffer.readUInt16BE(0);

    timeHi = (timeHi & 0x0fff) | 0x1000;

    var clockSeq = crypto.randomBytes(2);
    clockSeq[0] = (clockSeq[0] & 0x3f) | 0x80;

    var node = crypto.randomBytes(6);

    return (
        timeLow.toString(16).padStart(8, '0') + '-' +
        timeMid.toString(16).padStart(4, '0') + '-' +
        timeHi.toString(16).padStart(4, '0') + '-' +
        clockSeq.toString('hex').slice(0, 4) + '-' +
        node.toString('hex')
    );
}

function uuidv3(name, namespace) {
    var namespaceBuffer = Buffer.from(namespace.replace(/-/g, ''), 'hex');
    var nameBuffer = Buffer.from(name, 'utf8');

    var hash = crypto.createHash('md5').update(namespaceBuffer).update(nameBuffer).digest();

    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    return (
        hash.toString('hex').slice(0, 8) + '-' +
        hash.toString('hex').slice(8, 12) + '-' +
        hash.toString('hex').slice(12, 16) + '-' +
        hash.toString('hex').slice(16, 20) + '-' +
        hash.toString('hex').slice(20, 32)
    );
}

function uuidv4() {
    var rnds = crypto.randomBytes(16);

    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    return rnds.toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}

function uuidv5(name, namespace) {
    var namespaceBuffer = Buffer.from(namespace.replace(/-/g, ''), 'hex');
    var nameBuffer = Buffer.from(name, 'utf8');

    var hash = crypto.createHash('sha1').update(namespaceBuffer).update(nameBuffer).digest();

    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    return (
        hash.toString('hex').slice(0, 8) + '-' +
        hash.toString('hex').slice(8, 12) + '-' +
        hash.toString('hex').slice(12, 16) + '-' +
        hash.toString('hex').slice(16, 20) + '-' +
        hash.toString('hex').slice(20, 32)
    );
}

module.exports.uuid = {
    uuidv1,
    uuidv3,
    uuidv4,
    uuidv5
};