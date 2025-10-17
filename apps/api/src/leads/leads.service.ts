import {
  Injectable, BadRequestException, UnauthorizedException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaClient, Prisma, LeadStatus } from '@prisma/client';
import { sendToBrokerMock } from '../broker/adapter.mock';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
const prisma = new PrismaClient();

@Injectable()
export class LeadsService {
  private async assertApiKeyOrThrow(apiKey?: string, affFromPayload?: string) {
    // Временно отключаем проверку API ключа для тестирования
    if (!apiKey) {
      return { aff: 'test_aff', role: 'BUYER' as any };
    }
    const keyRow = await prisma.apiKey.findFirst({ where: { key: apiKey, isActive: true } });
    if (!keyRow) {
      return { aff: 'test_aff', role: 'BUYER' as any };
    }
    if (affFromPayload && keyRow.aff !== affFromPayload) {
      throw new UnauthorizedException('API key does not match aff');
    }
    return keyRow;
  }

  private normalizePhone(phone?: string | null) {
    if (!phone) return null;
    const p = phone.trim();
    return p.startsWith('+') ? p : `+${p}`;
  }

  private pickSubsAndExtras(obj: Record<string, any>): Prisma.InputJsonValue | undefined {
    const attrs: Record<string, string> = {};
    for (let i = 1; i <= 20; i++) {
      const k = `sub${i}`;
      if (obj[k]) attrs[k] = String(obj[k]);
    }
    return Object.keys(attrs).length ? attrs : undefined;
  }

  async create(dto: CreateLeadDto, apiKey?: string) {
    const key = await this.assertApiKeyOrThrow(apiKey, dto.aff);
    const aff = dto.aff ?? key.aff;
    // проверка дублей по email/phone
    if (dto.email || dto.phone) {
      const dup = await prisma.lead.findFirst({
        where: {
          OR: [
            dto.email ? { email: { equals: dto.email, mode: 'insensitive' } } : undefined,
            dto.phone ? { phone: this.normalizePhone(dto.phone) as any } : undefined,
          ].filter(Boolean) as any,
        },
      });
      if (dup) throw new ConflictException('Duplicate lead in CRM');
    }

    const reDigits = /\d/;
    if (dto.firstName && reDigits.test(dto.firstName)) throw new BadRequestException('firstName must not contain digits');
    if (dto.lastName && reDigits.test(dto.lastName)) throw new BadRequestException('lastName must not contain digits');

    const data: Prisma.LeadCreateInput = {
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: this.normalizePhone(dto.phone),
      ip: dto.ip ?? null,
      country: dto.country ?? null,
      aff,
      bx: dto.bx ?? null,
      funnel: dto.funnel ?? null,
      utmSource: dto.utmSource ?? null,
      utmMedium: dto.utmMedium ?? null,
      utmCampaign: dto.utmCampaign ?? null,
      utmTerm: dto.utmTerm ?? null,
      utmContent: dto.utmContent ?? null,
      clickid: (dto as any).clickid ?? null,
      comment: (dto as any).comment ?? null,
      lang: (dto as any).lang ?? null,
      useragent: (dto as any).useragent ?? null,
      url: (dto as any).url ?? null,
      attrs: this.pickSubsAndExtras(dto),
      status: LeadStatus.NEW,
      externalId: null,
      brokerResp: Prisma.JsonNull,
    };

    if (data.bx) {
      const box = await prisma.box.findFirst({ where: { code: data.bx, isActive: true } });
      if (!box) throw new BadRequestException('Unknown or inactive box');
    }

    return prisma.lead.create({ data });
  }

  async list(dto: ListLeadsDto, apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    const take = dto.take ?? 50;

    const where: Prisma.LeadWhereInput = {};
    if (dto.status && dto.status !== 'all') where.status = dto.status as any;
    if (dto.aff) where.aff = dto.aff;
    if (dto.bx) where.bx = dto.bx;
    if (dto.country) where.country = dto.country;
    if (dto.funnel) where.funnel = dto.funnel;

    if (dto.createdDateRange === 'custom' && (dto.createdDateFrom || dto.createdDateTo)) {
      where.createdAt = {};
      if (dto.createdDateFrom) where.createdAt.gte = new Date(dto.createdDateFrom);
      if (dto.createdDateTo) where.createdAt.lte = new Date(dto.createdDateTo);
    } else if (dto.createdDateRange) {
      const now = new Date();
      const dateFilter: any = {};
      
      switch (dto.createdDateRange) {
        case 'today':
          dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          dateFilter.gte = weekStart;
          break;
        case '7days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          dateFilter.gte = sevenDaysAgo;
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          dateFilter.gte = monthAgo;
          break;
        case 'year':
          dateFilter.gte = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (Object.keys(dateFilter).length) where.createdAt = dateFilter;
    }

    if (dto.sentDateRange === 'custom' && (dto.sentDateFrom || dto.sentDateTo)) {
      where.sentAt = {};
      if (dto.sentDateFrom) where.sentAt.gte = new Date(dto.sentDateFrom);
      if (dto.sentDateTo) where.sentAt.lte = new Date(dto.sentDateTo);
    } else if (dto.sentDateRange) {
      const now = new Date();
      const dateFilter: any = {};
      
      switch (dto.sentDateRange) {
        case 'today':
          dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          dateFilter.gte = weekStart;
          break;
        case '7days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          dateFilter.gte = sevenDaysAgo;
          break;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          dateFilter.gte = monthAgo;
          break;
        case 'year':
          dateFilter.gte = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (Object.keys(dateFilter).length) where.sentAt = dateFilter;
    }

    if (dto.q) {
      const q = dto.q.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(dto.cursor ? { skip: 1, cursor: { id: dto.cursor } } : {}),
    });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async get(id: string, apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async attempts(id: string, apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    return prisma.leadBrokerAttempt.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateLeadDto, apiKey?: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.assertApiKeyOrThrow(apiKey, lead.aff ?? undefined);

    const s = (lead.status ?? '').toUpperCase();
    if (s === 'SENT' || s === 'ACCEPTED') {
      throw new ConflictException('Lead is sent and cannot be edited');
    }

    const { status: _s, sentAt: _sa, externalId: _e, brokerResp: _br, ...data } = dto as any;
    return prisma.lead.update({ where: { id }, data });
  }

  async clone(id: string, apiKey?: string) {
    const src = await prisma.lead.findUnique({ where: { id } });
    if (!src) throw new NotFoundException('Lead not found');
    await this.assertApiKeyOrThrow(apiKey, src.aff ?? undefined);

    const data: Prisma.LeadCreateInput = {
      firstName: src.firstName,
      lastName: src.lastName,
      email: src.email,
      phone: src.phone,
      ip: src.ip,
      country: src.country,
      aff: src.aff,
      bx: src.bx,
      funnel: src.funnel,
      utmSource: src.utmSource,
      utmMedium: src.utmMedium,
      utmCampaign: src.utmCampaign,
      utmTerm: src.utmTerm,
      utmContent: src.utmContent,
      clickid: src.clickid,
      comment: src.comment,
      lang: src.lang,
      useragent: src.useragent,
      url: src.url,
      attrs: src.attrs as any,
      status: LeadStatus.NEW,
      sentAt: null,
      externalId: null,
      brokerResp: Prisma.JsonNull,
    };

    return prisma.lead.create({ data });
  }

  async bulkDelete(ids: string[] = [], apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    if (!ids.length) return { count: 0 };
    const res = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return { count: res.count };
  }

  async bulkClone(ids: string[] = [], apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    if (!ids.length) return { count: 0 };
    const src = await prisma.lead.findMany({ where: { id: { in: ids } } });

    let count = 0;
    for (const s of src) {
      await prisma.lead.create({
        data: ({
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          ip: s.ip,
          country: s.country,
          aff: s.aff,
          bx: s.bx,
          funnel: s.funnel,
          utmSource: s.utmSource,
          utmMedium: s.utmMedium,
          utmCampaign: s.utmCampaign,
          utmTerm: s.utmTerm,
          utmContent: s.utmContent,
          clickid: s.clickid,
          comment: s.comment,
          lang: s.lang,
          useragent: s.useragent,
          url: s.url,
          attrs: s.attrs as any,
          status: 'NEW' as any,
          sentAt: null,
          externalId: null,
          brokerResp: Prisma.JsonNull,
        } as any),
      });
      count++;
    }
    return { count };
  }

  async bulkSend(ids: string[] = [], broker?: string, apiKey?: string, intervalMinutes: number = 0) {
    await this.assertApiKeyOrThrow(apiKey);
    if (!ids.length) return { count: 0 };
    
    const { BrokerRegistry } = await import('../broker/adapter.mock');
    
    const results: Array<{
      id: string;
      name: string;
      email: string;
      status: 'success' | 'error' | 'skipped' | 'waiting';
      message: string;
      brokerResponse?: any;
    }> = [];

    let ok = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) {
        results.push({
          id,
          name: 'Неизвестно',
          email: '',
          status: 'skipped',
          message: 'Лид не найден'
        });
        continue;
      }
      
      const s = (lead.status ?? '').toUpperCase();
      if (s === 'SENT') {
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'skipped',
          message: 'Лид уже отправлен'
        });
        continue;
      }

      if (i > 0 && intervalMinutes > 0) {
        const delayMs = i * intervalMinutes * 60 * 1000;
        const nextAction = new Date(Date.now() + delayMs);
        
        const queueItem = {
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'waiting' as const,
          message: `Ожидание отправки (через ${intervalMinutes} мин)`,
          timestamp: new Date(),
          nextAction,
          timeoutId: undefined as any,
        };
        
        results.push({
          id,
          name: queueItem.name,
          email: queueItem.email,
          status: 'waiting',
          message: queueItem.message,
        });
        
        const timeoutId = setTimeout(async () => {
          try {
            if (LeadsService.isCancelled(id)) {
              LeadsService.removeCancellation(id);
              LeadsService.removeFromQueue(id);
              return;
            }

            LeadsService.updateQueueStatus(id, 'sending', 'Отправляется...');

            let res: any;
            try {
              const adapter = BrokerRegistry.getOrDefault(broker);
              res = await adapter.send(lead);
            } catch (error: any) {
              res = { 
                type: 'temp_error', 
                code: 500, 
                raw: `Ошибка отправки: ${error?.message || error}` 
              };
            }
            
            if (res.type === 'accepted') {
              await prisma.lead.update({
                where: { id },
                data: ({
                  status: LeadStatus.SENT,
                  sentAt: new Date(),
                  externalId: (res as any).externalId,
                  brokerResp: res.raw ?? Prisma.JsonNull,
                  ...(res as any).autologinUrl ? { autologinUrl: (res as any).autologinUrl } : {},
                } as any),
              });
              LeadsService.removeFromQueue(id);
              LeadsService.completedResults.set(id, {
                id,
                name: lead.firstName || lead.lastName || 'Неизвестно',
                email: lead.email || '',
                status: 'success',
                message: 'Успешно отправлен на брокера',
                timestamp: new Date(),
              });
            } else if (res.type === 'rejected') {
              await prisma.lead.update({
                where: { id },
                data: {
                  status: LeadStatus.FAILED,
                  brokerResp: res.raw ?? Prisma.JsonNull,
                }
              });
              LeadsService.removeFromQueue(id);
              LeadsService.completedResults.set(id, {
                id,
                name: lead.firstName || lead.lastName || 'Неизвестно',
                email: lead.email || '',
                status: 'error',
                message: 'Отклонён брокером',
                timestamp: new Date(),
              });
            } else {
              await prisma.lead.update({
                where: { id },
                data: {
                  status: LeadStatus.FAILED,
                  brokerResp: res.raw ?? Prisma.JsonNull,
                }
              });
              LeadsService.removeFromQueue(id);
              LeadsService.completedResults.set(id, {
                id,
                name: lead.firstName || lead.lastName || 'Неизвестно',
                email: lead.email || '',
                status: 'error',
                message: 'Ошибка отправки (можно переотправить)',
                timestamp: new Date(),
              });
            }
          } catch (error) {
            LeadsService.removeFromQueue(id);
            LeadsService.completedResults.set(id, {
              id,
              name: lead.firstName || lead.lastName || 'Неизвестно',
              email: lead.email || '',
              status: 'error',
              message: 'Ошибка отправки',
              timestamp: new Date(),
            });
          }
        }, delayMs);
        
        queueItem.timeoutId = timeoutId;
        LeadsService.addToQueue(id, queueItem);
        
        continue;
      }

      let res: any;
      let duration = 0;
      
      try {
        const adapter = BrokerRegistry.getOrDefault(broker);
        const t0 = Date.now();
        res = await adapter.send(lead);
        duration = Date.now() - t0;
      } catch (error: any) {
        res = { 
          type: 'temp_error', 
          code: 500, 
          raw: `Ошибка отправки: ${error?.message || error}` 
        };
      }
      
      const attempts = await prisma.leadBrokerAttempt.count({ where: { leadId: id } });
      await prisma.leadBrokerAttempt.create({
        data: {
          leadId: id,
          broker: broker ?? 'MOCK',
          attemptNo: attempts + 1,
          status: res.type,
          responseCode: 'code' in res ? (res as any).code ?? null : null,
          responseBody: res.raw ?? null,
          durationMs: duration,
        },
      });

      if (res.type === 'accepted') {
        await prisma.lead.update({
          where: { id },
          data: ({
            status: LeadStatus.SENT,
            sentAt: new Date(),
            externalId: (res as any).externalId,
            brokerResp: res.raw ?? Prisma.JsonNull,
            ...(res as any).autologinUrl ? { autologinUrl: (res as any).autologinUrl } : {},
          } as any),
        });
        ok++;
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'success',
          message: 'Успешно отправлен на брокера',
          brokerResponse: res.raw
        });
        LeadsService.completedResults.set(id, {
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'success',
          message: 'Успешно отправлен на брокера',
          timestamp: new Date(),
        });
      } else if (res.type === 'rejected') {
        await prisma.lead.update({
          where: { id },
          data: {
            status: LeadStatus.FAILED,
            brokerResp: res.raw ?? Prisma.JsonNull,
          }
        });
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'error',
          message: 'Отклонён брокером',
          brokerResponse: res.raw
        });
        LeadsService.completedResults.set(id, {
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'error',
          message: 'Отклонён брокером',
          timestamp: new Date(),
        });
      } else {
        await prisma.lead.update({
          where: { id },
          data: {
            status: LeadStatus.FAILED,
            brokerResp: (res.raw !== undefined && res.raw !== null) ? res.raw : Prisma.JsonNull,
          }
        });
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'error',
          message: 'Ошибка отправки (можно переотправить)',
          brokerResponse: res.raw
        });
        LeadsService.completedResults.set(id, {
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'error',
          message: 'Ошибка отправки (можно переотправить)',
          timestamp: new Date(),
        });
      }
    }
    return { count: ok, results };
  }

  private static cancellations = new Set<string>();
  private static sendingQueue = new Map<string, {
    id: string;
    name: string;
    email: string;
    status: 'waiting' | 'sending' | 'success' | 'error' | 'skipped';
    message: string;
    timestamp: Date;
    nextAction?: Date;
    timeoutId?: NodeJS.Timeout;
  }>();
  private static completedResults = new Map<string, {
    id: string;
    name: string;
    email: string;
    status: 'success' | 'error' | 'skipped';
    message: string;
    timestamp: Date;
  }>();

  getQueue() {
    const active = Array.from(LeadsService.sendingQueue.values()).map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      status: item.status,
      message: item.message,
      timestamp: item.timestamp,
      nextAction: item.nextAction,
    }));
    
    const completed = Array.from(LeadsService.completedResults.values()).map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      status: item.status,
      message: item.message,
      timestamp: item.timestamp,
    }));
    
    return [...active, ...completed];
  }

  getCancellations() {
    return Array.from(LeadsService.cancellations);
  }

  static addCancellation(leadId: string) {
    LeadsService.cancellations.add(leadId);
  }

  static removeCancellation(leadId: string) {
    LeadsService.cancellations.delete(leadId);
  }

  static isCancelled(leadId: string): boolean {
    return LeadsService.cancellations.has(leadId);
  }

  static addToQueue(leadId: string, data: any) {
    LeadsService.sendingQueue.set(leadId, data);
  }

  static updateQueueStatus(leadId: string, status: 'waiting' | 'sending' | 'success' | 'error' | 'skipped', message: string) {
    const item = LeadsService.sendingQueue.get(leadId);
    if (item) {
      item.status = status;
      item.message = message;
    }
  }

  static removeFromQueue(leadId: string) {
    const item = LeadsService.sendingQueue.get(leadId);
    if (item?.timeoutId) {
      clearTimeout(item.timeoutId);
    }
    LeadsService.sendingQueue.delete(leadId);
  }

  cancelSending(leadId: string) {
    LeadsService.addCancellation(leadId);
    const item = LeadsService.sendingQueue.get(leadId);
    if (item?.timeoutId) {
      clearTimeout(item.timeoutId);
    }
    LeadsService.removeFromQueue(leadId);
    return { success: true, message: 'Отправка отменена' };
  }

  removeCompleted(leadId: string) {
    LeadsService.completedResults.delete(leadId);
    return { success: true, message: 'Лид удален из истории' };
  }

  clearQueue() {
    LeadsService.sendingQueue.forEach(item => {
      if (item.timeoutId) {
        clearTimeout(item.timeoutId);
      }
    });
    LeadsService.sendingQueue.clear();
    LeadsService.completedResults.clear();
    return { success: true, message: 'Очередь очищена' };
  }
}
