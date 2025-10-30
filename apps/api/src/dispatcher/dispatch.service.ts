import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createDispatchWorker } from '../queue/queue';
import { PrismaClient, LeadStatus } from '@prisma/client';
import { BrokerRegistry, MockAdapter } from '../broker/adapter.mock';
import { Job } from 'bullmq'; // <— добавили

const prisma = new PrismaClient();
const log = new Logger('DispatchWorker');

@Injectable()
export class DispatchService implements OnModuleInit {
  onModuleInit() {
    createDispatchWorker(async (job: Job): Promise<void> => {
      const { leadId, broker } = job.data as { leadId: string; broker?: string };
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) { log.warn(`Lead ${leadId} not found`); return; }

      const t0 = Date.now();

      // роутинг по брокеру — выбираем адаптер из реестра, по умолчанию MOCK
      const adapter = BrokerRegistry.getOrDefault(broker);
      const res = await adapter.send(lead);

      const duration = Date.now() - t0;
      const attempts = await prisma.leadBrokerAttempt.count({ where: { leadId } });
      await prisma.leadBrokerAttempt.create({
        data: {
          leadId,
          broker: broker ?? 'MOCK',
          attemptNo: attempts + 1,
          status: res.type,
          responseCode: 'code' in res ? res.code ?? null : null,
          responseBody: res.raw ?? null,
          durationMs: duration,
        },
      });

      if (res.type === 'accepted') {
        await prisma.lead.update({
          where: { id: leadId },
          data: ({
            status: LeadStatus.SENT,
            sentAt: new Date(),
            externalId: (res as any).externalId,
            brokerResp: (res as any).raw ?? null,
            broker: (broker ?? adapter.code ?? 'UNKNOWN'),
            brokerStatus: 'NEW', // Устанавливаем начальный статус брокера
            brokerStatusChangedAt: new Date(),
            ...(res as any).autologinUrl ? { autologinUrl: (res as any).autologinUrl } : {},
          } as any),
        });
      } else if (res.type === 'rejected') {
        await prisma.lead.update({ where: { id: leadId }, data: { status: LeadStatus.FAILED } });
      } else {
        // temp_error - оставляем NEW для возможности повторной отправки
        await prisma.lead.update({ where: { id: leadId }, data: { status: LeadStatus.NEW } });
        throw new Error('Temp error: retry');
      }
    });
    log.log('Dispatch worker started');
    // регистрация дефолтного адаптера
    BrokerRegistry.register(new MockAdapter());
  }
}
