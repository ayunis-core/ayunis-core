import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { ThreadPiiMaskRepository } from '../../../application/ports/thread-pii-mask.repository';
import { ThreadPiiMask } from '../../../domain/thread-pii-mask.entity';
import { ThreadPiiMaskRecord } from './schema/thread-pii-mask.record';
import { ThreadPiiMaskMapper } from './mappers/thread-pii-mask.mapper';

@Injectable()
export class PostgresThreadPiiMaskRepository extends ThreadPiiMaskRepository {
  private readonly logger = new Logger(PostgresThreadPiiMaskRepository.name);

  constructor(
    @InjectRepository(ThreadPiiMaskRecord)
    private readonly repository: Repository<ThreadPiiMaskRecord>,
  ) {
    super();
  }

  async findByThreadId(threadId: UUID): Promise<ThreadPiiMask[]> {
    this.logger.debug('findByThreadId', { threadId });

    const records = await this.repository.find({
      where: { threadId },
      order: { category: 'ASC', maskIndex: 'ASC' },
    });

    return records.map((record) => ThreadPiiMaskMapper.toDomain(record));
  }

  async saveMany(masks: ThreadPiiMask[]): Promise<void> {
    this.logger.debug('saveMany', { count: masks.length });

    if (masks.length === 0) {
      return;
    }
    await this.repository.save(
      masks.map((mask) => ThreadPiiMaskMapper.toRecord(mask)),
    );
  }
}
