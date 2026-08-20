import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { LocalSourceRepository } from './local-source.repository';
import type { SourceRecord } from './schema/source.record';
import type { TextSourceDetailsRecord } from './schema/text-source-details.record';
import type { DataSourceDetailsRecord } from './schema/data-source-details.record';
import type { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import type { SourceMapper } from './mappers/source.mapper';
import type { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';

describe('LocalSourceRepository', () => {
  it('returns a database-paginated page of workspace sources', async () => {
    const workspaceId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
    const records = [
      { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Budget.pdf' },
    ] as unknown as SourceRecord[];
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([records, 3]),
    };
    const sourceRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<SourceRecord>>;
    const mapper = {
      toDomain: jest.fn((record: SourceRecord) => record as unknown as Source),
    } as unknown as SourceMapper;
    const repository = new LocalSourceRepository(
      createPinoLoggerMock(),
      sourceRepository,
      {} as Repository<TextSourceDetailsRecord>,
      {} as Repository<DataSourceDetailsRecord>,
      {} as Repository<SourceContentChunkRecord>,
      mapper,
      {} as SourceContentChunkMapper,
    );

    const result = await repository.findPaginatedByWorkspaceId({
      workspaceId,
      search: 'budget',
      limit: 1,
      offset: 2,
    });

    expect(result.data).toEqual(records);
    expect(result.total).toBe(3);
    expect(result.limit).toBe(1);
    expect(result.offset).toBe(2);
    expect(queryBuilder.addSelect).toHaveBeenCalledWith(
      'LOWER(source.name)',
      'lower_source_name',
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'lower_source_name',
      'ASC',
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(2);
    expect(queryBuilder.take).toHaveBeenCalledWith(1);
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(1);
  });
});
