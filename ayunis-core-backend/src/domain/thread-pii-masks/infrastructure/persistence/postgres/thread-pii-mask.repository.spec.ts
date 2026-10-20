import { randomUUID } from 'crypto';
import { QueryFailedError, type Repository } from 'typeorm';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ThreadPiiMaskThreadMissingError } from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { ThreadPiiMaskRecord } from './schema/thread-pii-mask.record';
import { PostgresThreadPiiMaskRepository } from './thread-pii-mask.repository';

const THREAD_PII_MASKS_THREAD_FOREIGN_KEY = 'FK_297e25137f828aa2d8d10f6d267';

describe('PostgresThreadPiiMaskRepository', () => {
  const threadId = randomUUID();
  let save: jest.Mock;
  let repository: PostgresThreadPiiMaskRepository;

  const masks = () => [
    new ThreadPiiMask({
      threadId,
      category: PiiCategory.PERSON_NAME,
      maskIndex: 1,
      value: 'Dani',
    }),
  ];

  const insertFailure = (code: string, constraint: string) =>
    new QueryFailedError(
      'INSERT INTO thread_pii_masks',
      [],
      Object.assign(new Error('insert violates foreign key constraint'), {
        code,
        constraint,
      }),
    );

  beforeEach(() => {
    save = jest.fn();
    repository = new PostgresThreadPiiMaskRepository({
      save,
    } as unknown as Repository<ThreadPiiMaskRecord>);
  });

  it('reports when the mask parent thread disappeared', async () => {
    save.mockRejectedValue(
      insertFailure('23503', THREAD_PII_MASKS_THREAD_FOREIGN_KEY),
    );

    await expect(repository.saveMany(masks())).rejects.toMatchObject({
      constructor: ThreadPiiMaskThreadMissingError,
      threadId,
    });
  });

  it.each([
    ['unrelated foreign-key', '23503', 'FK_unexpected_mask_relation'],
    ['unique', '23505', 'UQ_thread_pii_masks_thread_category_value'],
  ])('keeps %s failures visible', async (_, code, constraint) => {
    const failure = insertFailure(code, constraint);
    save.mockRejectedValue(failure);

    await expect(repository.saveMany(masks())).rejects.toBe(failure);
  });
});
