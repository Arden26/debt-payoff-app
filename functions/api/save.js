/**
 * POST /api/save
 * Saves user data to Cloudflare KV keyed by anonymous session ID.
 * Body: { sessionId: string, data: object | null }
 */
export async function onRequestPost({ request, env }) {
  // Check KV is bound (only available after wrangler.toml is configured)
  if (!env.DEBT_PAYOFF_KV) {
    return new Response(JSON.stringify({ ok: false, error: 'KV not configured' }), {
      status: 503,
      headers: corsHeaders('application/json'),
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders('application/json'),
    });
  }

  const { sessionId, data } = body;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid sessionId' }), {
      status: 400,
      headers: corsHeaders('application/json'),
    });
  }

  const key = `session:${sessionId}`;

  if (data === null) {
    // Clear data
    await env.DEBT_PAYOFF_KV.delete(key);
  } else {
    await env.DEBT_PAYOFF_KV.put(key, JSON.stringify(data), {
      expirationTtl: 60 * 60 * 24 * 365, // 1 year TTL
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: corsHeaders('application/json'),
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

function corsHeaders(contentType) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}
