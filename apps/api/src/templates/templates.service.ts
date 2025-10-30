import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BrokerRegistry, HttpTemplateAdapter } from '../broker/adapter.mock';

const logger = new Logger('TemplatesService');

const prisma = new PrismaClient();

function toLines(body: any): string {
  if (!body) return '';
  if (typeof body === 'string') {
    const s = body.trim();
    // Handle double-encoded JSON string like "{\"a\":1}"
    if ((s.startsWith('"') && s.endsWith('"')) && s.includes('\\"')) {
      try {
        const unwrapped = JSON.parse(s); // becomes '{"a":1}'
        return toLines(unwrapped);
      } catch {}
    }
    try {
      const obj = JSON.parse(s);
      return toLines(obj);
    } catch {}
    // Fallback for JSON-like with macros (e.g., {"offer":${OFFER}}) – extract pairs heuristically
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('{"') && s.includes('":'))) {
      const inner = s.slice(1, -1); // remove { }
      const parts = inner.split(',');
      const lines: string[] = [];
      for (const raw of parts) {
        const idx = raw.indexOf(':');
        if (idx === -1) continue;
        const keyPart = raw.slice(0, idx).trim();
        const valPart = raw.slice(idx + 1).trim();
        const key = keyPart.replace(/^\"|\"$/g, '').replace(/^"|"$/g, '');
        let val = valPart;
        // unwrap quoted and escaped
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\"') && val.endsWith('\"'))) {
          try {
            val = JSON.parse(val);
          } catch {
            val = val.replace(/^\"|\"$/g, '').replace(/^"|"$/g, '');
          }
        }
        lines.push(`${key}: ${val};`);
      }
      if (lines.length) return lines.join('\n');
    }
    // Consider as form-url-encoded even if macros like ${...} contain braces
    if (s.includes('=') && s.includes('&')) {
      const pairs = s.split('&');
      return pairs
        .map(p => {
          const [k, ...rest] = p.split('=');
          const v = rest.join('=');
          try {
            return `${decodeURIComponent(k)}: ${decodeURIComponent(v)};`;
          } catch {
            return `${k}: ${v};`;
          }
        })
        .join('\n');
    }
    return s;
  }
  if (typeof body === 'object') {
    return Object.entries(body)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)};`)
      .join('\n');
  }
  return String(body);
}

@Injectable()
export class TemplatesService implements OnModuleInit {
  async onModuleInit() {
    logger.log('Initializing TemplatesService...');
    await this.registerActiveTemplates();
  }

  async registerActiveTemplates() {
    try {
      const templates = await prisma.brokerTemplate.findMany({ where: { isActive: true } });
      logger.log(`Found ${templates.length} active templates`);
      for (const t of templates) {
        BrokerRegistry.register(new HttpTemplateAdapter(
          t.code,
          {
            url: t.url,
            method: (t.method as any) ?? 'POST',
            headers: (t.headers as any) ?? undefined,
            body: t.body ?? undefined,
          },
          (t.params as any) ?? undefined,
          {
            passwordLength: t.passwordLength,
            passwordUseUpper: t.passwordUseUpper,
            passwordUseLower: t.passwordUseLower,
            passwordUseDigits: t.passwordUseDigits,
            passwordUseSpecial: t.passwordUseSpecial,
            passwordSpecialChars: t.passwordSpecialChars
          }
        ));
        logger.log(`Registered broker template: ${t.code}`);
      }
    } catch (error) {
      logger.error('Error registering templates:', error);
    }
  }

  async list() {
    const rows = await prisma.brokerTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(r => ({ ...r, body: toLines(r.body ?? '') }));
  }
  async get(id: string) {
    const row = await prisma.brokerTemplate.findUnique({ where: { id } });
    if (!row) return row as any;
    return { ...row, body: toLines(row.body ?? '') } as any;
  }
  async create(data: { code: string; name?: string; templateName?: string; isActive?: boolean; method?: string; url: string; headers?: any; body?: string | null; }) {
    const template = await prisma.brokerTemplate.create({ data: data as any });
    
    // Register the new template in BrokerRegistry if it's active
    if (template.isActive !== false) {
      BrokerRegistry.register(new HttpTemplateAdapter(
        template.code,
        {
          url: template.url,
          method: (template.method as any) ?? 'POST',
          headers: (template.headers as any) ?? undefined,
          body: template.body ?? undefined,
        },
        (template.params as any) ?? undefined,
        {
          passwordLength: template.passwordLength,
          passwordUseUpper: template.passwordUseUpper,
          passwordUseLower: template.passwordUseLower,
          passwordUseDigits: template.passwordUseDigits,
          passwordUseSpecial: template.passwordUseSpecial,
          passwordSpecialChars: template.passwordSpecialChars
        }
      ));
      logger.log(`Registered new broker template: ${template.code}`);
    }
    
    return template;
  }
  async update(id: string, data: Partial<{ code: string; name?: string; templateName?: string; isActive?: boolean; method?: string; url: string; headers?: any; body?: string | null; }>) {
    const template = await prisma.brokerTemplate.update({ where: { id }, data: data as any });
    
    // Re-register the updated template in BrokerRegistry if it's active
    if (template.isActive !== false) {
      BrokerRegistry.register(new HttpTemplateAdapter(
        template.code,
        {
          url: template.url,
          method: (template.method as any) ?? 'POST',
          headers: (template.headers as any) ?? undefined,
          body: template.body ?? undefined,
        },
        (template.params as any) ?? undefined,
        {
          passwordLength: template.passwordLength,
          passwordUseUpper: template.passwordUseUpper,
          passwordUseLower: template.passwordUseLower,
          passwordUseDigits: template.passwordUseDigits,
          passwordUseSpecial: template.passwordUseSpecial,
          passwordSpecialChars: template.passwordSpecialChars
        }
      ));
      logger.log(`Re-registered updated broker template: ${template.code}`);
    }
    
    return template;
  }
  delete(id: string) { return prisma.brokerTemplate.delete({ where: { id } }); }
}


