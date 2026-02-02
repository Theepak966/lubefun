/**
 * Unit tests for Blackjack pure logic.
 *
 * Why:
 * - Validates core rules in isolation (no DB/socket dependencies).
 * - Keeps regressions from creeping into the payout/hand-eval logic.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateHandValue,
  getCardMetaFromIndex,
  encodeCards,
  decodeCards
} = require('../services/games/blackjackLogic.js');

/**
 * Helper to build a card index from rank/suit.
 * rank: 1..13 (A..K), suit: 0..3
 */
function cardIndex(rank, suit) {
  return suit * 13 + (rank - 1);
}

test('getCardMetaFromIndex validates bounds', () => {
  assert.deepEqual(getCardMetaFromIndex(0), { rank: 1, suit: 0 });
  assert.deepEqual(getCardMetaFromIndex(51), { rank: 13, suit: 3 });
  assert.throws(() => getCardMetaFromIndex(-1));
  assert.throws(() => getCardMetaFromIndex(52));
});

test('calculateHandValue: blackjack detection', () => {
  const ace = cardIndex(1, 0);
  const king = cardIndex(13, 1);
  const v = calculateHandValue([ace, king]);
  assert.equal(v.total, 21);
  assert.equal(v.isBlackjack, true);
  assert.equal(v.isBust, false);
});

test('calculateHandValue: soft ace adjustment (A + 9 + A = 21)', () => {
  const ace1 = cardIndex(1, 0);
  const nine = cardIndex(9, 1);
  const ace2 = cardIndex(1, 2);
  const v = calculateHandValue([ace1, nine, ace2]);
  assert.equal(v.total, 21);
  assert.equal(v.isBust, false);
});

test('calculateHandValue: bust', () => {
  const ten = cardIndex(10, 0);
  const queen = cardIndex(12, 1); // value 10
  const two = cardIndex(2, 2);
  const v = calculateHandValue([ten, queen, two]);
  assert.equal(v.total, 22);
  assert.equal(v.isBust, true);
});

test('encode/decode roundtrip', () => {
  const cards = [0, 12, 13, 51];
  const encoded = encodeCards(cards);
  const decoded = decodeCards(encoded);
  assert.deepEqual(decoded, cards);
});

