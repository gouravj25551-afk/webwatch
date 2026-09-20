const test = require('node:test');
const assert = require('node:assert');
const { assertPaymentMatches, verifyWebhookSignature } = require('../src/services/dodoPayments');

test('webhook verifier reports a boolean result when the key is missing in development', () => {
  const result = verifyWebhookSignature(Buffer.from('{}'), {});
  assert.strictEqual(typeof result.valid, 'boolean');
});

test('payment fulfillment accepts matching server-side payment details', () => {
  const payment = { userId: 'user-1', dodoSessionId: 'session-1', amount: 100, currency: 'USD' };
  assert.doesNotThrow(() => assertPaymentMatches(payment, {
    userId: 'user-1', dodoSessionId: 'session-1', amount: 100, currency: 'usd',
  }));
});

test('payment fulfillment rejects forged ownership, amount, and session details', () => {
  const payment = { userId: 'user-1', dodoSessionId: 'session-1', amount: 100, currency: 'USD' };
  assert.throws(() => assertPaymentMatches(payment, {
    userId: 'attacker', dodoSessionId: 'session-1', amount: 100, currency: 'USD',
  }), /user does not match/);
  assert.throws(() => assertPaymentMatches(payment, {
    userId: 'user-1', dodoSessionId: 'forged', amount: 100, currency: 'USD',
  }), /session does not match/);
  assert.throws(() => assertPaymentMatches(payment, {
    userId: 'user-1', dodoSessionId: 'session-1', amount: 1, currency: 'USD',
  }), /amount does not match/);
});
