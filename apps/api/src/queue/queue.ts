import IORedis from 'ioredis';
import { Queue, Worker, Job, WorkerOptions } from 'bullmq';

const redis =
  process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        maxRetriesPerRequest: null, // <-- требование BullMQ
      });

export const dispatchQueue = new Queue('dispatchLead', { connection: redis });

export function createDispatchWorker(processor: (job: Job) => Promise<void>) {
  const opts: WorkerOptions = { connection: redis };
  return new Worker('dispatchLead', processor, opts);
}
