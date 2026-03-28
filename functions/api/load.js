/**
 * GET /api/load?sessionId=<id>
 * Loads user data from Cloudflare D1.
 * Returns: { data: object | null }
 */
export async function onRequestGet({ request, env }) {
  if (!env.FINANCE_DB) {
    return new Response(JSON.stringify({ data: null, error: 'DB not configured' }), {
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

  const row = await env.FINANCE_DB
    .prepare('SELECT data FROM sessions WHERE session_id = ?')
    .bind(sessionId)
    .first();

  const data = row ? JSON.parse(row.data) : null;

  return new Response(JSON.stringify({ data }), {
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
