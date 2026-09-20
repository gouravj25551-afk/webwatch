const { setTimeout: wait } = require('node:timers/promises');
const { Agent, request } = require('undici');
const { validatePublicUrl } = require('./urlSafety');

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function pinnedAgent(target) {
  return new Agent({
    connect: {
      lookup(hostname, options, callback) {
        if (options && options.all) {
          callback(null, [{ address: target.address, family: target.family }]);
          return;
        }
        callback(null, target.address, target.family);
      },
    },
  });
}

async function checkOnce(inputUrl, timeoutMs = 5_000) {
  const startedAt = Date.now();
  let currentUrl = inputUrl;

  try {
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const { parsedUrl, target } = await validatePublicUrl(currentUrl);
      const dispatcher = pinnedAgent(target);

      try {
        const response = await request(parsedUrl.toString(), {
          method: 'GET',
          maxRedirections: 0,
          signal: AbortSignal.timeout(timeoutMs),
          dispatcher,
          headers: {
            'User-Agent': 'WebWatch/1.0 uptime-monitor',
            Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
          },
        });

        if (REDIRECT_CODES.has(response.statusCode) && response.headers.location) {
          response.body.destroy();
          currentUrl = new URL(response.headers.location, parsedUrl).toString();
          continue;
        }

        response.body.destroy();
        return {
          url: parsedUrl.toString(),
          isUp: response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode,
          responseTimeMs: Date.now() - startedAt,
          error: null,
        };
      } finally {
        await dispatcher.close();
      }
    }

    throw new Error('Too many redirects');
  } catch (error) {
    return {
      url: currentUrl,
      isUp: false,
      statusCode: null,
      responseTimeMs: Date.now() - startedAt,
      error: error.name === 'TimeoutError' ? 'Request timed out after 5 seconds' : error.message,
    };
  }
}

async function checkWebsite(url, options = {}) {
  const attempts = Math.min(Math.max(options.attempts || 1, 1), 3);
  let lastResult;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await checkOnce(url, options.timeoutMs || 5_000);
    lastResult.attempts = attempt;

    if (lastResult.isUp) return lastResult;
    if (attempt < attempts) await wait(500);
  }

  return lastResult;
}

module.exports = { checkOnce, checkWebsite };
