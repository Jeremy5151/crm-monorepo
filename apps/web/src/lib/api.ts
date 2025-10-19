const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001';
const KEY  = process.env.NEXT_PUBLIC_API_KEY  ?? 'superadmin-key';

function joinUrl(base: string, path: string) {
  if (path.startsWith('http')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiGet(path: string, _init: RequestInit = {}) {
  const url = joinUrl(BASE, path);
  const res = await fetch(url, { headers: { 'X-API-Key': KEY, ...( _init.headers || {}) }, cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPatch(path: string, body: unknown) {
  const url = joinUrl(BASE, path);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path: string, body: unknown) {
  const url = joinUrl(BASE, path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error(errorText);
    // Сохраняем оригинальный текст ошибки для парсинга
    (error as any).originalMessage = errorText;
    throw error;
  }
  return res.json();
}

export async function apiDelete(path: string) {
  const url = joinUrl(BASE, path);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'X-API-Key': KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
