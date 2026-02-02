/**
 * Blackjack pure logic helpers.
 *
 * Why:
 * - Keep the game service readable and linear.
 * - Make the core rules easy to unit test (Node's built-in test runner).
 */

/**
 * @typedef {Object} BlackjackHandValue
 * @property {number} total
 * @property {boolean} isSoft
 * @property {boolean} isBlackjack
 * @property {boolean} isBust
 */

/**
 * Convert a 0..51 card index into rank/suit.
 *
 * Why index-based:
 * - It is compact to store in DB (`00..51`).
 * - It is deterministic for provably-fair shuffles.
 *
 * @param {number} index
 * @returns {{rank:number, suit:number}}
 */
function getCardMetaFromIndex(index){
    var safeIndex = Number(index);
    if(!Number.isFinite(safeIndex) || safeIndex < 0 || safeIndex > 51) {
        throw new Error('Invalid card index: ' + index);
    }

    var suit = Math.floor(safeIndex / 13);   // 0..3
    var rank = (safeIndex % 13) + 1;         // 1..13 (Ace..King)

    return { rank, suit };
}

/**
 * Render a 0..51 card index into a human-readable label like "A♠" or "10♦".
 *
 * @param {number|null} index
 * @returns {string}
 */
function getCardLabel(index){
    if(index === null) return '??';

    var meta = getCardMetaFromIndex(index);

    var rankLabel = meta.rank === 1 ? 'A'
        : meta.rank === 11 ? 'J'
        : meta.rank === 12 ? 'Q'
        : meta.rank === 13 ? 'K'
        : String(meta.rank);

    var suitLabel = [ '♠', '♥', '♦', '♣' ][meta.suit];

    return rankLabel + suitLabel;
}

/**
 * Get blackjack value for a rank.
 *
 * @param {number} rank 1..13
 * @returns {number}
 */
function getRankValue(rank){
    if(rank === 1) return 11; // Ace starts as 11; we soften later if needed
    if(rank >= 10) return 10; // 10/J/Q/K
    return rank;
}

/**
 * Calculate blackjack hand total with soft-ace adjustment.
 *
 * @param {number[]} cardIndexes
 * @returns {BlackjackHandValue}
 */
function calculateHandValue(cardIndexes){
    if(!Array.isArray(cardIndexes)) throw new Error('cardIndexes must be an array');

    var total = 0;
    var aceCount = 0;

    for(var i = 0; i < cardIndexes.length; i++){
        var meta = getCardMetaFromIndex(cardIndexes[i]);
        var value = getRankValue(meta.rank);

        total += value;
        if(meta.rank === 1) aceCount += 1;
    }

    // Soften aces from 11 -> 1 until <= 21 or no more aces.
    while(total > 21 && aceCount > 0){
        total -= 10;
        aceCount -= 1;
    }

    var isSoft = cardIndexes.some(function(idx){
        return getCardMetaFromIndex(idx).rank === 1;
    }) && total <= 21 && (function(){
        // If any ace remains valued as 11, total would be at least 11 more than a fully-softened version.
        // We approximate: a hand with an ace is "soft" when an ace could be counted as 11 without busting.
        var hardTotal = 0;
        for(var j = 0; j < cardIndexes.length; j++){
            var m = getCardMetaFromIndex(cardIndexes[j]);
            hardTotal += (m.rank === 1) ? 1 : getRankValue(m.rank);
        }
        return total !== hardTotal;
    })();

    var isBlackjack = cardIndexes.length === 2 && total === 21;
    var isBust = total > 21;

    return { total, isSoft, isBlackjack, isBust };
}

/**
 * Encode a list of 0..51 indices as a compact string "000512...".
 *
 * @param {number[]} cards
 * @returns {string}
 */
function encodeCards(cards){
    if(!Array.isArray(cards)) throw new Error('cards must be an array');
    return cards.map(function(n){
        var i = Number(n);
        if(!Number.isFinite(i) || i < 0 || i > 51) throw new Error('Invalid card index: ' + n);
        return ('0' + i).slice(-2);
    }).join('');
}

/**
 * Decode a compact card string into indices.
 *
 * @param {string} encoded
 * @returns {number[]}
 */
function decodeCards(encoded){
    if(typeof encoded !== 'string') throw new Error('encoded must be a string');
    if(encoded.length % 2 !== 0) throw new Error('encoded cards must be even length');

    var out = [];
    for(var i = 0; i < encoded.length; i += 2){
        var n = parseInt(encoded.slice(i, i + 2), 10);
        if(Number.isNaN(n)) throw new Error('Invalid encoded card: ' + encoded.slice(i, i + 2));
        out.push(n);
    }
    return out;
}

module.exports = {
    getCardMetaFromIndex,
    getCardLabel,
    calculateHandValue,
    encodeCards,
    decodeCards
};

