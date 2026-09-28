function requireSetting(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

export async function triggerWebWatch(env, fetchImpl = fetch) {
  const cronUrl = requireSetting(env.CRON_URL, 'CRON_URL');
  const cronSecret = requireSetting(env.CRON_SECRET, 'CRON_SECRET');
  const response = await fetchImpl(cronUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      Accept: 'application/json',
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`WebWatch cron returned HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  console.log(JSON.stringify({
    event: 'webwatch_cron_completed',
    scheduledAt: new Date().toISOString(),
    status: response.status,
    response: body.slice(0, 300),
  }));
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(triggerWebWatch(env));
  },

  async fetch() {
    return Response.json({
      success: true,
      message: 'WebWatch Cloudflare scheduler is active',
    });
  },
};
