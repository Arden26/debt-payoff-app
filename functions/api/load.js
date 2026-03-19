/**
 * GET /api/load?sessionId=<id>
 * Loads user data from Cloudflare KV.
 * Returns: { data: object | null }
 */
export async function onRequestGet({ request, env }) {
  if (!env.DEBT_PAYOFF_KV) {
    return new Response(JSON.stringify({ data: null, error: 'KV not configured' }), {
      status: 503,
      headers: corsHeaders('application/json'),
    });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return new Response(JSON.stringify({ data: null, error: 'Invalid sessionId' }), {
      status: 400,
      headers: corsHeaders('application/json'),
    });
  }

  const key = `session:${sessionId}`;
  const stored = await env.DEBT_PAYOFF_KV.get(key, 'json');

  return new Response(JSON.stringify({ data: stored ?? null }), {
    headers: corsHeaders('application/json'),
  });
}

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
