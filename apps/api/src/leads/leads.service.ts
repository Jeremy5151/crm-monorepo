import {
  Injectable, BadRequestException, UnauthorizedException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaClient, Prisma, LeadStatus } from '@prisma/client';
import { sendToBrokerMock } from '../broker/adapter.mock';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { SettingsService } from '../settings/settings.service';
import { BoxesService } from '../boxes/boxes.service';
import { getCurrentTimeInUtc } from '../utils/date-timezone';
import { applyVisibility } from '../visibility/visibility';
import { dispatchQueue } from '../queue/queue';
const prisma = new PrismaClient();

@Injectable()
export class LeadsService {
  constructor(
    private settingsService: SettingsService,
    private boxesService: BoxesService
  ) {}
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

  /**
   * Проверяет, можно ли отправлять лид в текущее время согласно настройкам доставки
   */
  private async isDeliveryTimeAllowed(boxBroker: any): Promise<boolean> {
    // Если время доставки не настроено - можно отправлять всегда
    if (!boxBroker.deliveryEnabled || !boxBroker.deliveryFrom || !boxBroker.deliveryTo) {
      return true;
    }

    try {
      // Получаем часовой пояс из настроек CRM
      const settings = await this.settingsService.getSettings();
      const timezone = settings.timezone || 'UTC';

      // Получаем текущее время в выбранном часовом поясе
      const now = getCurrentTimeInUtc();
      const currentTime = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      // Парсим время доставки
      const [fromHour, fromMin] = boxBroker.deliveryFrom.split(':').map(Number);
      const [toHour, toMin] = boxBroker.deliveryTo.split(':').map(Number);
      const [currentHour, currentMin] = currentTime.split(':').map(Number);

      const fromMinutes = fromHour * 60 + fromMin;
      const toMinutes = toHour * 60 + toMin;
      const currentMinutes = currentHour * 60 + currentMin;

      // Проверяем, попадает ли текущее время в диапазон доставки
      return currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
    } catch (error) {
      console.error('Ошибка проверки времени доставки:', error);
      // В случае ошибки разрешаем отправку
      return true;
    }
  }

  /**
   * Проверяет, не превышена ли капа для брокера
   */
  private async isLeadCapExceeded(boxBroker: any): Promise<boolean> {
    // Если капа не установлена - можно отправлять
    if (!boxBroker.leadCap) {
      return false;
    }

    try {
      // Подсчитываем количество успешно отправленных лидов на этого брокера
      const sentCount = await prisma.leadBrokerAttempt.count({
        where: {
          broker: boxBroker.brokerId,
          status: 'accepted'
        }
      });

      return sentCount >= boxBroker.leadCap;
    } catch (error) {
      console.error('Ошибка проверки капы:', error);
      // В случае ошибки разрешаем отправку
      return false;
    }
  }

  /**
   * Выбирает подходящего брокера для лида с учетом времени доставки и капы
   */
  private async selectBrokerForLead(lead: any, specifiedBroker?: string, box?: any): Promise<{ brokerId: string; reason: string; brokerName: string } | null> {
    // Если указан конкретный брокер - используем его
    if (specifiedBroker) {
      const broker = await prisma.brokerTemplate.findUnique({
        where: { id: specifiedBroker },
        select: { name: true }
      });
      return { 
        brokerId: specifiedBroker, 
        reason: 'Указан конкретный брокер',
        brokerName: broker?.name || 'Unknown Broker'
      };
    }

    try {
      // Если передан конкретный бокс - используем его
      let targetBox = box;
      
      // Если бокс не передан - ищем по стране
      if (!targetBox) {
        targetBox = await this.boxesService.getBoxForLead(lead.country);
      }
      
      if (!targetBox || !targetBox.brokers || targetBox.brokers.length === 0) {
        return null;
      }

      // Ищем первого доступного брокера по приоритету
      for (const boxBroker of targetBox.brokers) {
        const isTimeAllowed = await this.isDeliveryTimeAllowed(boxBroker);
        const isCapExceeded = await this.isLeadCapExceeded(boxBroker);
        
        if (isTimeAllowed && !isCapExceeded) {
          const broker = await prisma.brokerTemplate.findUnique({
            where: { id: boxBroker.brokerId },
            select: { name: true }
          });
          return { 
            brokerId: boxBroker.brokerId, 
            reason: `Бокс "${targetBox.name}", приоритет ${boxBroker.priority}`,
            brokerName: broker?.name || 'Unknown Broker'
          };
        }
      }

      // Если ни один брокер не доступен - возвращаем null
      return null;
    } catch (error) {
      console.error('Ошибка выбора брокера:', error);
      return null;
    }
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
      bx: (dto.bx !== undefined ? dto.bx : null) as any,
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

    // Добавляем связи с группами, если указаны
    if (dto.groupIds && dto.groupIds.length > 0) {
      data.groups = {
        create: dto.groupIds.map(groupId => ({
          group: { connect: { id: groupId } }
        }))
      };
    }
    
    const lead = await prisma.lead.create({ data });

    // Если указан параметр bx - ищем бокс по ID и отправляем лид
    if (dto.bx) {
      try {
        const box = await this.boxesService.get(dto.bx);
        
        if (!box) {
          // Бокс не найден - возвращаем лид с сообщением
          return {
            ...lead,
            message: 'Lead added to CRM, but no active box found for the specified bx parameter'
          };
        }

        if (!box.isActive) {
          // Бокс неактивен - возвращаем лид с сообщением
          return {
            ...lead,
            message: 'Lead added to CRM, but the specified box is not active'
          };
        }

        // Бокс найден и активен - выбираем брокера и отправляем лид
        const brokerSelection = await this.selectBrokerForLead(lead, undefined, box);
        
        if (!brokerSelection) {
          // Нет доступных брокеров в боксе - возвращаем лид с сообщением
          return {
            ...lead,
            message: 'Lead added to CRM, but no available brokers found in the specified box'
          };
        }

        // Добавляем лид в очередь на отправку
        await dispatchQueue.add('dispatchLead', {
          leadId: lead.id,
          broker: brokerSelection.brokerId
        });

        // Обновляем статус лида на NEW (он будет отправлен через очередь)
        return {
          ...lead,
          message: 'Lead added to CRM and queued for sending',
          broker: brokerSelection.brokerId
        };
      } catch (error) {
        console.error('Error processing box:', error);
        // В случае ошибки возвращаем лид как NEW
        return {
          ...lead,
          message: 'Lead added to CRM, but error occurred while processing box'
        };
      }
    }

    // Если bx не указан - просто возвращаем лид как NEW
    return {
      ...lead,
      message: 'Lead added to CRM, but no box specified (bx parameter)'
    };
  }

  async list(dto: ListLeadsDto, apiKey?: string) {
    const keyData = await this.assertApiKeyOrThrow(apiKey);
    const take = dto.take ?? 50;

    // Получаем пользователя по API ключу для проверки роли
    const user = await prisma.user.findUnique({
      where: { apiKey: apiKey || 'none' },
      include: {
        groups: {
          select: { id: true, group: { select: { id: true } } }
        }
      }
    });

    const where: Prisma.LeadWhereInput = {};
    
    // Фильтрация по ролям и группам
    if (user) {
      // Получаем ID групп пользователя
      const userGroupIds = user.groups.map(g => g.group.id);
      
      if (user.role === 'AFFILIATE' || user.role === 'AFFILIATE_MASTER') {
        // Получаем настройки видимости для пользователя
        const userSettings = await prisma.affSettings.findUnique({
          where: { aff: user.id }
        });
        
        const canViewGroupLeads = userSettings?.canViewGroupLeads ?? (user.role === 'AFFILIATE_MASTER');
        
        if (userGroupIds.length > 0 && canViewGroupLeads) {
          // Показываем все лиды из его групп (или без групп)
          where.OR = [
            { groups: { some: { groupId: { in: userGroupIds } } } },
            { groups: { none: {} } } // Лиды без групп
          ];
        } else if (userGroupIds.length > 0 && !canViewGroupLeads) {
          // AFFILIATE без разрешения видит только свои лиды
          where.userId = user.id;
        } else {
          // Пользователь без групп видит только свои лиды
          where.userId = user.id;
        }
      }
      // ADMIN и SUPERADMIN видят все лиды (нет фильтра)
    }

    if (dto.status && dto.status !== 'all') where.status = dto.status as any;
    if (dto.aff) where.aff = dto.aff;
    if (dto.bx !== undefined) where.bx = dto.bx as any;
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

    // Применяем маскировку полей для аффилиатов
    let maskedItems = items;
    if (user && (user.role === 'AFFILIATE' || user.role === 'AFFILIATE_MASTER')) {
      // Получаем группы пользователя с настройками видимости (одним запросом)
      const userGroupIds = (await prisma.groupToUser.findMany({
        where: { userId: user.id },
        select: { groupId: true }
      })).map(g => g.groupId);
      
      // Получаем все настройки групп пользователя (одним запросом)
      const userGroupsSettings = userGroupIds.length > 0 ? await prisma.group.findMany({
        where: { id: { in: userGroupIds } },
        select: { id: true, nameVisibility: true, emailVisibility: true, phoneVisibility: true }
      }) : [];
      
      const groupsSettingsMap = new Map(userGroupsSettings.map(g => [g.id, g]));
      
      // Получаем группы для всех лидов (одним запросом)
      const leadIds = items.map(i => i.id);
      const leadGroups = leadIds.length > 0 ? await prisma.groupToLead.findMany({
        where: { leadId: { in: leadIds } },
        select: { leadId: true, groupId: true }
      }) : [];
      
      // Группируем по лидам
      const leadGroupsMap = new Map<string, string[]>();
      leadGroups.forEach(lg => {
        const existing = leadGroupsMap.get(lg.leadId) || [];
        existing.push(lg.groupId);
        leadGroupsMap.set(lg.leadId, existing);
      });
      
      // Получаем настройки видимости для аффилиатов (одним запросом)
      const affIds = [...new Set(items.map(i => i.aff).filter(Boolean))];
      const affSettings = affIds.length > 0 ? await prisma.affSettings.findMany({
        where: { aff: { in: affIds as string[] } }
      }) : [];
      const settingsMap = new Map(affSettings.map(s => [s.aff, s]));
      
      maskedItems = items.map(item => {
        // Проверяем, есть ли у лида группа, в которой состоит пользователь
        const itemGroupIds = leadGroupsMap.get(item.id) || [];
        const relevantGroupId = itemGroupIds.find(gid => userGroupIds.includes(gid));
        
        if (relevantGroupId) {
          // Используем настройки группы
          const groupSettings = groupsSettingsMap.get(relevantGroupId);
          if (groupSettings) {
            const settings = {
              nameVisibility: groupSettings.nameVisibility,
              emailVisibility: groupSettings.emailVisibility,
              phoneVisibility: groupSettings.phoneVisibility,
            };
            return applyVisibility(item, settings as any);
          }
        }
        
        // Если лид не привязан к группе пользователя, используем стандартную логику с affSettings
        const settings = item.aff ? settingsMap.get(item.aff) : null;
        return applyVisibility(item, settings);
      });
    }

    // Получаем общее количество лидов для пагинации
    const total = await prisma.lead.count({ where });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items: maskedItems, total, nextCursor };
  }

  async get(id: string, apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    const lead = await prisma.lead.findUnique({ 
      where: { id },
      include: {
        statusEvents: {
          where: { kind: 'brokerStatus' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async getStatusHistory(id: string, apiKey?: string) {
    await this.assertApiKeyOrThrow(apiKey);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    
    return prisma.leadStatusEvent.findMany({
      where: { 
        leadId: id,
        kind: 'brokerStatus'
      },
      orderBy: { createdAt: 'desc' }
    });
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
        // Предварительно выбираем брокера и фиксируем в БД, чтобы не терять его в таймере
        const preselected = await this.selectBrokerForLead(lead, broker);
        if (!preselected) {
          results.push({
            id,
            name: lead.firstName || lead.lastName || 'Неизвестно',
            email: lead.email || '',
            status: 'skipped',
            message: 'Нет доступных брокеров в текущее время',
          });
          continue;
        }
        try {
          await prisma.lead.update({
            where: { id },
            data: {
              broker: preselected.brokerId,
              brokerStatus: 'NEW',
              brokerStatusChangedAt: getCurrentTimeInUtc(),
            },
          });
        } catch (_) {}
        
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
            let duration = 0;
            // Используем ранее зафиксированного брокера из БД
            const leadRef = await prisma.lead.findUnique({ where: { id }, select: { broker: true } });
            const finalBrokerId = String(leadRef?.broker || 'UNKNOWN');
            console.log(`[DELAYED_SEND] Lead ${id}: Using queued broker ${finalBrokerId}`);
            try {
              const adapter = BrokerRegistry.getOrDefault(finalBrokerId);
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

            // Создаем запись о попытке отправки
            const attempts = await prisma.leadBrokerAttempt.count({ where: { leadId: id } });
            await prisma.leadBrokerAttempt.create({
              data: {
                leadId: id,
                broker: finalBrokerId,
                attemptNo: attempts + 1,
                status: res.type,
                responseCode: 'code' in res ? (res as any).code ?? null : null,
                responseBody: res.raw ?? null,
                durationMs: duration,
                createdAt: getCurrentTimeInUtc(),
              },
            });
            // Гарантируем, что у лида зафиксирован брокер сразу после попытки
            try {
              await prisma.lead.update({ where: { id }, data: { broker: finalBrokerId } });
            } catch (_) {}
            
            if (res.type === 'accepted') {
              console.log(`[DELAYED_SEND] Lead ${id}: Updating lead with broker ${finalBrokerId}`);
              const updateData: any = {
                status: LeadStatus.SENT,
                sentAt: getCurrentTimeInUtc(),
                externalId: (res as any).externalId,
                brokerResp: res.raw ?? Prisma.JsonNull,
                broker: finalBrokerId, // КРИТИЧНО: сохраняем брокера ПЕРЕД всеми остальными полями
                brokerStatus: 'NEW',
                brokerStatusChangedAt: getCurrentTimeInUtc(),
              };
              if ((res as any).autologinUrl) {
                updateData.autologinUrl = (res as any).autologinUrl;
              }
              await prisma.lead.update({
                where: { id },
                data: updateData,
              });
              // DB-level safety: if broker is still NULL, pull it from the latest attempt
              try {
                await prisma.$executeRawUnsafe(
                  `UPDATE "Lead" SET broker = COALESCE(broker, (
                     SELECT broker FROM "LeadBrokerAttempt" WHERE "leadId" = $1 ORDER BY "createdAt" DESC LIMIT 1
                   )) WHERE id = $1`,
                  id,
                );
              } catch (_) {}
              console.log(`[DELAYED_SEND] Lead ${id}: Lead updated successfully with broker ${finalBrokerId}`);
              // Страховка: если по какой-то причине broker остался пустым, досохраняем
              const afterUpdate = await prisma.lead.findUnique({ where: { id } });
              if (!afterUpdate?.broker) {
                console.log(`[DELAYED_SEND] Lead ${id}: Broker was lost, trying to restore from attempts or selection`);
                // Попробуем взять брокера из последней попытки
                const lastAttempt = await prisma.leadBrokerAttempt.findFirst({
                  where: { leadId: id },
                  orderBy: { createdAt: 'desc' },
                  select: { broker: true },
                });
                const fallbackBroker = lastAttempt?.broker || finalBrokerId;
                await prisma.lead.update({ where: { id }, data: { broker: fallbackBroker } });
                console.log(`[DELAYED_SEND] Lead ${id}: Broker restored to ${fallbackBroker}`);
              } else {
                console.log(`[DELAYED_SEND] Lead ${id}: Broker is correctly set to ${afterUpdate.broker}`);
              }
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

      // Выбираем подходящего брокера с учетом времени доставки
      const brokerSelection = await this.selectBrokerForLead(lead, broker);
      if (!brokerSelection) {
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'skipped',
          message: 'Нет доступных брокеров в текущее время'
        });
        continue;
      }

      let res: any;
      let duration = 0;
      
      try {
        const adapter = BrokerRegistry.getOrDefault(brokerSelection.brokerId);
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
          broker: brokerSelection.brokerId,
          attemptNo: attempts + 1,
          status: res.type,
          responseCode: 'code' in res ? (res as any).code ?? null : null,
          responseBody: res.raw ?? null,
          durationMs: duration,
          createdAt: getCurrentTimeInUtc(),
        },
      });
      // Гарантируем, что у лида зафиксирован брокер сразу после попытки
      try {
        await prisma.lead.update({ where: { id }, data: { broker: brokerSelection.brokerId } });
      } catch (_) {}

      if (res.type === 'accepted') {
        await prisma.lead.update({
          where: { id },
          data: ({
            status: LeadStatus.SENT,
            sentAt: getCurrentTimeInUtc(),
            externalId: (res as any).externalId,
            brokerResp: res.raw ?? Prisma.JsonNull,
            broker: brokerSelection.brokerId,
            brokerStatus: 'NEW',
            brokerStatusChangedAt: getCurrentTimeInUtc(),
            ...(res as any).autologinUrl ? { autologinUrl: (res as any).autologinUrl } : {},
          } as any),
        });
        // DB-level safety: if broker is still NULL, pull it from the latest attempt
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "Lead" SET broker = COALESCE(broker, (
               SELECT broker FROM "LeadBrokerAttempt" WHERE "leadId" = $1 ORDER BY "createdAt" DESC LIMIT 1
             )) WHERE id = $1`,
            id,
          );
        } catch (_) {}
        ok++;
        results.push({
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'success',
          message: `Успешно отправлен на брокера (${brokerSelection.reason})`,
          brokerResponse: res.raw
        });
        LeadsService.completedResults.set(id, {
          id,
          name: lead.firstName || lead.lastName || 'Неизвестно',
          email: lead.email || '',
          status: 'success',
          message: `Успешно отправлен на брокера (${brokerSelection.reason})`,
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
