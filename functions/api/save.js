/**
 * POST /api/save
 * Saves user data to Cloudflare D1 keyed by anonymous session ID.
 * Body: { sessionId: string, data: object | null }
 */
export async function onRequestPost({ request, env }) {
  if (!env.FINANCE_DB) {
    return new Response(JSON.stringify({ ok: false, error: 'DB not configured' }), {
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

  if (data === null) {
    await env.FINANCE_DB.prepare('DELETE FROM sessions WHERE session_id = ?')
      .bind(sessionId)
      .run();
  } else {
    await env.FINANCE_DB
      .prepare('INSERT OR REPLACE INTO sessions (session_id, data, updated_at) VALUES (?, ?, unixepoch())')
      .bind(sessionId, JSON.stringify(data))
      .run();
  }

  return new Response(JSON.stringify({ ok: true }), {
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
