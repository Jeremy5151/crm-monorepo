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
  | { type: 'accepted'; externalId: string; autologinUrl?: string; raw?: string; requestUrl?: string; requestHeaders?: Record<string, string>; requestBody?: string }
  | { type: 'rejected'; code?: number; raw?: string; requestUrl?: string; requestHeaders?: Record<string, string>; requestBody?: string }
  | { type: 'temp_error'; code?: number; raw?: string; requestUrl?: string; requestHeaders?: Record<string, string>; requestBody?: string };

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
 * Генерация случайного пароля с настройками
 */
function generatePassword(settings?: {
  length?: number;
  useUpper?: boolean;
  useLower?: boolean;
  useDigits?: boolean;
  useSpecial?: boolean;
  specialChars?: string;
}): string {
  const length = settings?.length || 8;
  const useUpper = settings?.useUpper !== false;
  const useLower = settings?.useLower !== false;
  const useDigits = settings?.useDigits !== false;
  const useSpecial = settings?.useSpecial !== false;
  const specialChars = settings?.specialChars || '!@#$%';
  
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  
  let charset = '';
  if (useUpper) charset += upper;
  if (useLower) charset += lower;
  if (useDigits) charset += digits;
  if (useSpecial) charset += specialChars;
  
  if (!charset) charset = lower + digits; // fallback
  
  let password = '';
  
  // Гарантируем хотя бы по одному символу каждого типа
  if (useUpper && length > 0) password += upper[Math.floor(Math.random() * upper.length)];
  if (useLower && length > 1) password += lower[Math.floor(Math.random() * lower.length)];
  if (useDigits && length > 2) password += digits[Math.floor(Math.random() * digits.length)];
  if (useSpecial && length > 3) password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Дополняем до нужной длины
  while (password.length < length) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Перемешиваем символы
  return password.split('').sort(() => Math.random() - 0.5).join('');
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
        const settings = params?._passwordSettings;
        return generatePassword(settings ? {
          length: settings.passwordLength,
          useUpper: settings.passwordUseUpper,
          useLower: settings.passwordUseLower,
          useDigits: settings.passwordUseDigits,
          useSpecial: settings.passwordUseSpecial,
          specialChars: settings.passwordSpecialChars
        } : undefined);
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
  private passwordSettings: any;
  
  constructor(code: string, tpl: HttpTemplate, params?: Record<string, any>, passwordSettings?: any) { 
    this.code = code;
    this.tpl = tpl;
    this.params = { ...(params || {}), _passwordSettings: passwordSettings };
    this.passwordSettings = passwordSettings;
  }
  async send(lead: Lead): Promise<BrokerResult> {
    console.log(`[HttpTemplateAdapter] Sending lead ${lead.id} to broker ${this.code}`);
    console.log(`[HttpTemplateAdapter] Template:`, JSON.stringify(this.tpl, null, 2));
    
    let url = '';
    let headers: Record<string, string> = {};
    let body: string | undefined = undefined;
    
    try {
      url = renderTemplate(this.tpl.url, lead, this.params);
      console.log(`[HttpTemplateAdapter] Rendered URL:`, url);
      const method = this.tpl.method ?? 'POST';
      headers = { ...(this.tpl.headers ?? {}) };
      
      body = this.tpl.body ? renderTemplate(this.tpl.body, lead, this.params) : undefined;
      console.log(`[HttpTemplateAdapter] Rendered body:`, body);
      
      // Определяем Content-Type
      const contentType = headers['content-type'] || headers['Content-Type'];
      const isJson = contentType?.includes('application/json');
      const isFormUrlEncoded = contentType?.includes('application/x-www-form-urlencoded');
      
      // Для POST JSON добавляем Content-Type если не указан
      if (method === 'POST' && !contentType && body) {
        headers['content-type'] = 'application/json';
      }
      
      // Если body это JSON и нужно form-urlencoded - конвертируем
      if (isFormUrlEncoded && body && body.trim()) {
        try {
          const bodyObj = JSON.parse(body);
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(bodyObj)) {
            params.append(key, String(value ?? ''));
          }
          body = params.toString();
          console.log(`[HttpTemplateAdapter] Converted JSON to form-urlencoded:`, body);
        } catch (e) {
          console.error(`[HttpTemplateAdapter] Failed to convert to form-urlencoded:`, e);
          // Если не JSON, используем как есть
        }
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
      
      // 📋 ПОЛНЫЙ ЗАПРОС (ДО ОТПРАВКИ)
      console.log(`
========================================
📤 OUTGOING REQUEST (${this.code})
========================================
Method: ${method}
URL: ${url}
Headers: ${JSON.stringify(headers, null, 2)}
Body: ${body || '(empty)'}
========================================
`);
      
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
      
      // 📋 ПОЛНЫЙ ОТВЕТ (ПОЛУЧЕННЫЙ)
      console.log(`
========================================
📥 INCOMING RESPONSE (${this.code})
========================================
Status: ${resp.status} ${resp.statusText}
Headers: ${JSON.stringify(Object.fromEntries(resp.headers), null, 2)}
Body: ${raw}
========================================
`);
      
      if (!resp.ok) return { type: resp.status >= 500 ? 'temp_error' : 'rejected', code: resp.status, raw, requestUrl: url, requestHeaders: headers, requestBody: body };
      
      try {
        const json = JSON.parse(raw);
        
        // AlgoLead формат: { status: "Success", data: { UserID, RedirectTo, ... } }
        if (json.status === 'Success' && json.data) {
          const externalId = String(json.data.UserID || json.data.AccountID || json.data.LoginID || 'EXT');
          const autologinUrl = json.data.RedirectTo || json.data.BrandAutoLogin;
          return { type: 'accepted', externalId, autologinUrl, raw, requestUrl: url, requestHeaders: headers, requestBody: body };
        }
        
        // AlgoLead ошибка: { status: "Failed", errors: "..." }
        if (json.status === 'Failed') {
          const reason = typeof json.errors === 'string' ? json.errors : JSON.stringify(json.errors);
          return { type: 'rejected', code: 400, raw: reason, requestUrl: url, requestHeaders: headers, requestBody: body };
        }
        
        // Trackbox формат
        if (json.status !== undefined) {
          if (json.status === true || json.status === 'true') {
            const externalId = json.addonData?.uniqueid ?? json.uniqueid ?? json.id ?? 'EXT';
            const autologinUrl = json.addonData?.brokerUrl ?? json.brokerUrl ?? json.login_url;
            return { type: 'accepted', externalId: String(externalId), autologinUrl, raw, requestUrl: url, requestHeaders: headers, requestBody: body };
          } else {
            const reason = json.data ?? json.message ?? 'Rejected by broker';
            return { type: 'rejected', code: 400, raw: reason, requestUrl: url, requestHeaders: headers, requestBody: body };
          }
        }
        
        if (json.user_id || json.customer_id || json.id) {
          const externalId = String(json.user_id ?? json.customer_id ?? json.id ?? 'EXT');
          const autologinUrl = json.login_url ?? json.autologin ?? json.autologin_url;
          return { type: 'accepted', externalId, autologinUrl, raw, requestUrl: url, requestHeaders: headers, requestBody: body };
        }
        
        if (json.externalId || json.external_id) {
          return { type: 'accepted', externalId: String(json.externalId ?? json.external_id), autologinUrl: json.autologinUrl ?? json.autologin_url, raw, requestUrl: url, requestHeaders: headers, requestBody: body };
        }
        
        return { type: 'accepted', externalId: 'EXT', raw, requestUrl: url, requestHeaders: headers, requestBody: body };
      } catch {
        return { type: 'accepted', externalId: 'EXT', raw, requestUrl: url, requestHeaders: headers, requestBody: body };
      }
    } catch (error) {
      console.error(`[HttpTemplateAdapter] Request failed:`, error);
      return { type: 'temp_error', code: 500, raw: `Request failed: ${error}`, requestUrl: url, requestHeaders: headers, requestBody: body };
    }
  }
}
