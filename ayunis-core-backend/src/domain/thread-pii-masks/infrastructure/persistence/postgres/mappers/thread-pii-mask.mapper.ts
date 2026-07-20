import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { ThreadPiiMaskRecord } from '../schema/thread-pii-mask.record';

export class ThreadPiiMaskMapper {
  static toDomain(record: ThreadPiiMaskRecord): ThreadPiiMask {
    return new ThreadPiiMask({
      id: record.id,
      threadId: record.threadId,
      category: record.category,
      maskIndex: record.maskIndex,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: ThreadPiiMask): ThreadPiiMaskRecord {
    const record = new ThreadPiiMaskRecord();
    record.id = domain.id;
    record.threadId = domain.threadId;
    record.category = domain.category;
    record.maskIndex = domain.maskIndex;
    record.value = domain.value;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
