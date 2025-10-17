import type { Lead } from '@prisma/client';
import fetch from 'node-fetch';
import * as https from 'https';

// Agent для отключения проверки SSL (для dev/testing)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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

/**
 * Генерация случайного пароля формата: Aa12345!
 */
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '!@#$%';
  
  const randomChar = (str: string) => str[Math.floor(Math.random() * str.length)];
  const randomNum = () => Math.floor(Math.random() * 10);
  
  return (
    chars[Math.floor(Math.random() * chars.length)].toUpperCase() + // A
    randomChar(chars) + // a
    randomNum() + randomNum() + randomNum() + randomNum() + randomNum() + // 12345
    randomChar(special) // !
  );
}

/**
 * Извлечение кода страны из телефона
 * Поддерживает все международные форматы
 */
function extractPhonePrefix(phone: string): string {
  if (!phone) return '';
  
  // Убираем все кроме цифр
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  
  // Коды стран (самые популярные)
  const countryCodes: Record<string, number> = {
    // 4-значные коды
    '1242': 4, '1246': 4, '1264': 4, '1268': 4, '1284': 4, '1340': 4, '1345': 4, '1441': 4, '1473': 4, '1649': 4, '1664': 4, '1670': 4, '1671': 4, '1684': 4, '1758': 4, '1767': 4, '1784': 4, '1809': 4, '1829': 4, '1849': 4, '1868': 4, '1869': 4, '1876': 4,
    // 3-значные коды
    '372': 3, '376': 3, '420': 3, '421': 3, '423': 3,
    // 2-значные коды
    '30': 2, '31': 2, '32': 2, '33': 2, '34': 2, '36': 2, '39': 2, '40': 2, '41': 2, '43': 2, '44': 2, '45': 2, '46': 2, '47': 2, '48': 2, '49': 2, '51': 2, '52': 2, '53': 2, '54': 2, '55': 2, '56': 2, '57': 2, '58': 2, '60': 2, '61': 2, '62': 2, '63': 2, '64': 2, '65': 2, '66': 2, '81': 2, '82': 2, '84': 2, '86': 2, '90': 2, '91': 2, '92': 2, '93': 2, '94': 2, '95': 2, '98': 2,
    // 1-значные коды
    '1': 1, '7': 1
  };
  
  // Пробуем найти код страны
  for (let len = 4; len >= 1; len--) {
    const prefix = cleaned.slice(0, len);
    if (countryCodes[prefix] === len) {
      return prefix;
    }
  }
  
  // Если не нашли - берем первые 1-3 цифры по умолчанию
  return cleaned.slice(0, Math.min(3, cleaned.length));
}

export function renderTemplate(template: string, lead: Lead, params?: Record<string, any>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    const trimmedKey = String(key).trim();
    
    // Сначала проверяем в params (параметры интеграции)
    if (params && trimmedKey in params) {
      return params[trimmedKey] == null ? '' : String(params[trimmedKey]);
    }
    
    // Специальная обработка для phonePrefix
    if (trimmedKey === 'phonePrefix') {
      return extractPhonePrefix(lead.phone || '');
    }
    
    // Специальная обработка для phoneNumber (без префикса)
    if (trimmedKey === 'phoneNumber') {
      const phone = (lead.phone || '').replace(/\D/g, '');
      const prefix = extractPhonePrefix(lead.phone || '');
      return phone.slice(prefix.length);
    }
    
    // Специальная обработка для password - генерируем если нет
    if (trimmedKey === 'password') {
      const attrs = lead.attrs as any;
      if (!attrs?.password) {
        return generatePassword();
      }
    }
    
    // Потом в lead
    const path = trimmedKey.split('.');
    let val: any = lead as any;
    for (const k of path) val = val?.[k];
    
    return val == null ? '' : String(val);
  });
}

export class HttpTemplateAdapter implements BrokerAdapter {
  code: string;
  private tpl: HttpTemplate;
  private params: Record<string, any>;
  
  constructor(code: string, tpl: HttpTemplate, params?: Record<string, any>) { 
    this.code = code;
    this.tpl = tpl;
    this.params = params || {};
  }
  async send(lead: Lead): Promise<BrokerResult> {
    console.log(`[HttpTemplateAdapter] Sending lead ${lead.id} to broker ${this.code}`);
    console.log(`[HttpTemplateAdapter] Template:`, JSON.stringify(this.tpl, null, 2));
    try {
      const url = renderTemplate(this.tpl.url, lead, this.params);
      console.log(`[HttpTemplateAdapter] Rendered URL:`, url);
      const method = this.tpl.method ?? 'POST';
      const headers: Record<string, string> = { ...(this.tpl.headers ?? {}) };
      
      let body = this.tpl.body ? renderTemplate(this.tpl.body, lead, this.params) : undefined;
      console.log(`[HttpTemplateAdapter] Rendered body:`, body);
      
      // Определяем Content-Type
      const contentType = headers['content-type'] || headers['Content-Type'];
      const isJson = contentType?.includes('application/json');
      const isFormUrlEncoded = contentType?.includes('application/x-www-form-urlencoded');
      
      // Для POST JSON добавляем Content-Type если не указан
      if (method === 'POST' && !contentType && body) {
        headers['content-type'] = 'application/json';
      }
      
      // Проверяем JSON только для JSON body
      if (isJson && body && body.trim()) {
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
        resp = await fetch(url, { 
          method, 
          headers, 
          body,
          agent: url.startsWith('https') ? httpsAgent : undefined
        } as any);
      } catch (fetchError: any) {
        console.error(`[HttpTemplateAdapter] Fetch failed:`, fetchError);
        return { type: 'temp_error', code: 500, raw: `Network error: ${fetchError?.message || fetchError}` };
      }
      const raw = await resp.text();
      console.log(`[HttpTemplateAdapter] Response status: ${resp.status}, body:`, raw.substring(0, 200));
      if (!resp.ok) return { type: resp.status >= 500 ? 'temp_error' : 'rejected', code: resp.status, raw };
      
      try {
        const json = JSON.parse(raw);
        
        // AlgoLead формат: { status: "Success", data: { UserID, RedirectTo, ... } }
        if (json.status === 'Success' && json.data) {
          const externalId = String(json.data.UserID || json.data.AccountID || json.data.LoginID || 'EXT');
          const autologinUrl = json.data.RedirectTo || json.data.BrandAutoLogin;
          return { type: 'accepted', externalId, autologinUrl, raw };
        }
        
        // AlgoLead ошибка: { status: "Failed", errors: "..." }
        if (json.status === 'Failed') {
          const reason = typeof json.errors === 'string' ? json.errors : JSON.stringify(json.errors);
          return { type: 'rejected', code: 400, raw: reason };
        }
        
        // Trackbox формат
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
