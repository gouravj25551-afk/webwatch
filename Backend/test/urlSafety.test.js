const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicAddress, parseHttpUrl } = require('../src/services/urlSafety');

test('allows URLs with or without an explicit protocol', () => {
  assert.equal(parseHttpUrl('https://example.com/path').hostname, 'example.com');
  assert.equal(parseHttpUrl('http://example.com').protocol, 'http:');
  assert.equal(parseHttpUrl('example.com').toString(), 'https://example.com/');
  assert.equal(parseHttpUrl('example.com/api/health').toString(), 'https://example.com/api/health');
});

test('rejects unsupported protocols and credentials', () => {
  assert.throws(() => parseHttpUrl('ftp://example.com'));
  assert.throws(() => parseHttpUrl('https://user:pass@example.com'));
});

test('rejects local hostnames', () => {
  assert.throws(() => parseHttpUrl('http://localhost:3000'));
  assert.throws(() => parseHttpUrl('http://service.internal'));
});

test('classifies private and public IP addresses', () => {
  assert.equal(isPublicAddress('127.0.0.1'), false);
  assert.equal(isPublicAddress('10.0.0.1'), false);
  assert.equal(isPublicAddress('192.168.1.2'), false);
  assert.equal(isPublicAddress('::1'), false);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});
