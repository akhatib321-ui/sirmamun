// src/jobs/jobs.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queues } from './queue-names';
import { MatchSalesItemsProcessor } from './processors/match-sales-items.processor';
import { GenerateReorderProcessor } from './processors/generate-reorder.processor';

/**
 * @Global() — queues are available for injection across all modules
 * without importing JobsModule in each feature module.
 *
 * To add a job to a queue from any service:
 *   constructor(@InjectQueue(Queues.MATCH_SALES_ITEMS) private queue: Queue) {}
 *   await this.queue.add('match', jobData);
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        },
        defaultJobOptions: {
          attempts: 3,                    // retry failed jobs 3 times
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 50 }, // keep last 50 completed jobs for debugging
          removeOnFail:     { count: 100 }, // keep last 100 failed jobs
        },
      }),
    }),
    BullModule.registerQueue(
      { name: Queues.MATCH_SALES_ITEMS },
      { name: Queues.GENERATE_REORDER },
    ),
  ],
  providers: [
    MatchSalesItemsProcessor,
    GenerateReorderProcessor,
  ],
  exports: [BullModule],
})
export class JobsModule {}
