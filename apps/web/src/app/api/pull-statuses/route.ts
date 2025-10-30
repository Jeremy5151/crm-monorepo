const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST() {
  try {
    const response = await fetch(`${API_BASE}/v1/broker/pull-statuses`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const headers = { 'Content-Type': 'application/json' } as Record<string, string>;

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `API error: ${response.status} ${errorText}` }),
        { status: response.status, headers }
      );
    }

    const text = await response.text();
    // Pass-through JSON if possible
    try {
      const data = JSON.parse(text);
      return new Response(JSON.stringify(data), { status: 200, headers });
    } catch {
      return new Response(text, { status: 200, headers });
    }
  } catch (e: any) {
    console.error('Error calling pull-statuses API:', e);
    return new Response(
      JSON.stringify({ error: 'Failed to pull statuses' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
