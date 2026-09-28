import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerWebWatch } from '../src/index.js';

test('calls the protected WebWatch cron endpoint with the configured secret', async () => {
  let receivedUrl;
  let receivedOptions;
  const fakeFetch = async (url, options) => {
    receivedUrl = url;
    receivedOptions = options;
    return new Response('{"success":true}', { status: 200 });
  };

  await triggerWebWatch({
    CRON_URL: 'https://webwatch.example/api/cron',
    CRON_SECRET: 'test-secret',
  }, fakeFetch);

  assert.equal(receivedUrl, 'https://webwatch.example/api/cron');
  assert.equal(receivedOptions.method, 'GET');
  assert.equal(receivedOptions.headers.Authorization, 'Bearer test-secret');
});

test('rejects a missing cron secret before making a request', async () => {
  await assert.rejects(
    triggerWebWatch({ CRON_URL: 'https://webwatch.example/api/cron' }, async () => {
      throw new Error('fetch should not be called');
    }),
    /CRON_SECRET is required/,
  );
});

test('reports a failed WebWatch cron response', async () => {
  await assert.rejects(
    triggerWebWatch({
      CRON_URL: 'https://webwatch.example/api/cron',
      CRON_SECRET: 'test-secret',
    }, async () => new Response('Unauthorized', { status: 401 })),
    /HTTP 401: Unauthorized/,
  );
});
