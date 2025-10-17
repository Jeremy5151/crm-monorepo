import type { Lead } from '@prisma/client';

export interface BrokerAdapter {
  code: string;
  send(lead: Lead): Promise<BrokerResult>;
}

export class BrokerRegistry {
  private static adapters: Map<string, BrokerAdapter> = new Map();
  static register(adapter: BrokerAdapter) { this.adapters.set(adapter.code.toUpperCase(), adapter); }
  static get(code?: string): BrokerAdapter | undefined {
    if (!code) return undefined;
    return this.adapters.get(code.toUpperCase());
  }
  static getOrDefault(code?: string): BrokerAdapter {
    return this.get(code) ?? new MockAdapter();
  }
}

export type BrokerResult =
  | { type: 'accepted'; externalId: string; autologinUrl?: string; raw?: string }
  | { type: 'rejected'; code?: number; raw?: string }
  | { type: 'temp_error'; code?: number; raw?: string };

export async function sendToBrokerMock(lead: Lead): Promise<BrokerResult> {
  const delay = 200 + Math.floor(Math.random() * 400);
  await new Promise((r) => setTimeout(r, delay));
  const rnd = Math.random();
  if (rnd < 0.75) return { type: 'accepted', externalId: `MOCK-${lead.id.slice(0, 6)}`, autologinUrl: `https://mock-broker.example/autologin/${lead.id}`, raw: 'ok' };
  if (rnd < 0.90) return { type: 'temp_error', code: 503, raw: 'upstream timeout' };
  return { type: 'rejected', code: 400, raw: 'bad payload' };
}

export class MockAdapter implements BrokerAdapter {
  code = 'MOCK';
  send(lead: Lead) { return sendToBrokerMock(lead); }
}

export type HttpTemplate = {
  url: string; method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string; // шаблон строки с плейсхолдерами ${...}
};

export function renderTemplate(template: string, lead: Lead): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    const path = String(key).trim().split('.');
    let val: any = lead as any;
    for (const k of path) val = val?.[k];
    return val == null ? '' : String(val);
  });
}

export class HttpTemplateAdapter implements BrokerAdapter {
  code: string;
  private tpl: HttpTemplate;
  constructor(code: string, tpl: HttpTemplate) { this.code = code; this.tpl = tpl; }
  async send(lead: Lead): Promise<BrokerResult> {
    console.log(`[HttpTemplateAdapter] Sending lead ${lead.id} to broker ${this.code}`);
    console.log(`[HttpTemplateAdapter] Template:`, JSON.stringify(this.tpl, null, 2));
    try {
      const url = renderTemplate(this.tpl.url, lead);
      console.log(`[HttpTemplateAdapter] Rendered URL:`, url);
      const method = this.tpl.method ?? 'POST';
      const headers: Record<string, string> = { 'content-type': 'application/json', ...(this.tpl.headers ?? {}) };
      let body = this.tpl.body ? renderTemplate(this.tpl.body, lead) : undefined;
      console.log(`[HttpTemplateAdapter] Rendered body:`, body);
      
      if (body && body.trim()) {
        try {
          JSON.parse(body);
          console.log(`[HttpTemplateAdapter] Body JSON is valid`);
        } catch (e) {
          console.error(`[HttpTemplateAdapter] Invalid JSON in body:`, e);
          return { type: 'temp_error', code: 400, raw: `Invalid JSON in body template: ${e}` };
        }
      }
      
      console.log(`[HttpTemplateAdapter] Sending fetch request...`);
      let resp;
      try {
        resp = await fetch(url, { method, headers, body });
      } catch (fetchError: any) {
        console.error(`[HttpTemplateAdapter] Fetch failed:`, fetchError);
        return { type: 'temp_error', code: 500, raw: `Network error: ${fetchError?.message || fetchError}` };
      }
      const raw = await resp.text();
      console.log(`[HttpTemplateAdapter] Response status: ${resp.status}, body:`, raw.substring(0, 200));
      if (!resp.ok) return { type: resp.status >= 500 ? 'temp_error' : 'rejected', code: resp.status, raw };
      
      try {
        const json = JSON.parse(raw);
        
        if (json.status !== undefined) {
          if (json.status === true || json.status === 'true') {
            const externalId = json.addonData?.uniqueid ?? json.uniqueid ?? json.id ?? 'EXT';
            const autologinUrl = json.addonData?.brokerUrl ?? json.brokerUrl ?? json.login_url;
            return { type: 'accepted', externalId: String(externalId), autologinUrl, raw };
          } else {
            const reason = json.data ?? json.message ?? 'Rejected by broker';
            return { type: 'rejected', code: 400, raw: reason };
          }
        }
        
        if (json.user_id || json.customer_id || json.id) {
          const externalId = String(json.user_id ?? json.customer_id ?? json.id ?? 'EXT');
          const autologinUrl = json.login_url ?? json.autologin ?? json.autologin_url;
          return { type: 'accepted', externalId, autologinUrl, raw };
        }
        
        if (json.externalId || json.external_id) {
          return { type: 'accepted', externalId: String(json.externalId ?? json.external_id), autologinUrl: json.autologinUrl ?? json.autologin_url, raw };
        }
        
        return { type: 'accepted', externalId: 'EXT', raw };
      } catch {
        return { type: 'accepted', externalId: 'EXT', raw };
      }
    } catch (error) {
      console.error(`[HttpTemplateAdapter] Request failed:`, error);
      return { type: 'temp_error', code: 500, raw: `Request failed: ${error}` };
    }
  }
}
