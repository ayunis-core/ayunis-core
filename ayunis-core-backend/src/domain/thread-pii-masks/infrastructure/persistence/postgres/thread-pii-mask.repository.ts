import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';
import { ThreadPiiMaskRepository } from 'src/domain/thread-pii-masks/application/ports/thread-pii-mask.repository';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ThreadPiiMaskThreadMissingError } from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import { ThreadPiiMaskRecord } from './schema/thread-pii-mask.record';
import { ThreadPiiMaskMapper } from './mappers/thread-pii-mask.mapper';

const PG_FOREIGN_KEY_VIOLATION = '23503';
const THREAD_PII_MASKS_THREAD_FOREIGN_KEY = 'FK_297e25137f828aa2d8d10f6d267';

function matchesThreadForeignKey(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as Record<string, unknown>;
  if (
    record.code === PG_FOREIGN_KEY_VIOLATION &&
    record.constraint === THREAD_PII_MASKS_THREAD_FOREIGN_KEY
  ) {
    return true;
  }
  return matchesThreadForeignKey(record.driverError);
}

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
    this.logger.debug({ threadId }, 'findByThreadId');

    const records = await this.repository.find({
      where: { threadId },
      order: { category: 'ASC', maskIndex: 'ASC' },
    });

    return records.map((record) => ThreadPiiMaskMapper.toDomain(record));
  }

  async saveMany(masks: ThreadPiiMask[]): Promise<void> {
    this.logger.debug({ count: masks.length }, 'saveMany');

    if (masks.length === 0) {
      return;
    }
    try {
      await this.repository.save(
        masks.map((mask) => ThreadPiiMaskMapper.toRecord(mask)),
      );
    } catch (error) {
      if (matchesThreadForeignKey(error)) {
        throw new ThreadPiiMaskThreadMissingError(masks[0].threadId);
      }
      throw error;
    }
  }
}
