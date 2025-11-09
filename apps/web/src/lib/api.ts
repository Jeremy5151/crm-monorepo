const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';

function joinUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

// Get API key from localStorage
function getApiKey() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('apiToken') || 'superadmin-key';
  }
  return 'superadmin-key';
}

export async function apiGet(path: string, _init: RequestInit = {}) {
  const url = joinUrl(BASE, path);
  const apiKey = getApiKey();
  const res = await fetch(url, { headers: { 'X-API-Key': apiKey, ...( _init.headers || {}) }, cache: 'no-store' });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText || res.statusText);
    (error as any).status = res.status;
    (error as any).responseBody = errorText;
    throw error;
  }
  return res.json();
}

export async function apiPatch(path: string, body: unknown) {
  const url = joinUrl(BASE, path);
  const apiKey = getApiKey();
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText || res.statusText);
    (error as any).status = res.status;
    (error as any).responseBody = errorText;
    throw error;
  }
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const url = joinUrl(BASE, path);
  const apiKey = getApiKey();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText || res.statusText);
    (error as any).status = res.status;
    // Сохраняем оригинальный текст ошибки для парсинга
    (error as any).originalMessage = errorText;
    (error as any).responseBody = errorText;
    throw error;
  }
  return res.json();
}

export async function apiDelete(path: string) {
  const url = joinUrl(BASE, path);
  const apiKey = getApiKey();
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText || res.statusText);
    (error as any).status = res.status;
    (error as any).responseBody = errorText;
    throw error;
  }
  return res.json();
}
