import type { Repository, SelectQueryBuilder } from 'typeorm';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { LocalArtifactsRepository } from './local-artifacts.repository';
import type { ArtifactMapper } from './mappers/artifact.mapper';
import type { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import type { ArtifactRecord } from './schema/artifact.record';
import type { ArtifactVersionRecord } from './schema/artifact-version.record';
import type { DocumentArtifactRecord } from './schema/document-artifact.record';

describe('LocalArtifactsRepository', () => {
  it('lists only supported artifact types for a workspace', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    } as unknown as jest.Mocked<SelectQueryBuilder<ArtifactRecord>>;
    const artifactRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<ArtifactRecord>;
    const artifactMapper = {
      toDomain: jest.fn(),
    } as unknown as ArtifactMapper;
    const versionRepository = {} as Repository<ArtifactVersionRecord>;
    const documentArtifactRepository = {} as Repository<DocumentArtifactRecord>;
    const versionMapper = {} as ArtifactVersionMapper;
    const repository = new LocalArtifactsRepository(
      createPinoLoggerMock(),
      artifactRepository,
      documentArtifactRepository,
      versionRepository,
      artifactMapper,
      versionMapper,
    );

    await repository.findByWorkspaceId(
      '95da2ba4-7067-4326-9bcb-4c8a83f9fc17',
      '0e8f87fd-c031-43bc-b149-679eb9d86192',
      { limit: 20, offset: 0 },
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'artifact.type IN (:...artifactTypes)',
      { artifactTypes: Object.values(ArtifactType) },
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(20);
  });
});
