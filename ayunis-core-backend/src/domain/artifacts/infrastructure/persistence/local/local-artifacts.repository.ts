import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';

import {
  ArtifactsByWorkspaceListOptions,
  ArtifactsRepository,
} from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactVersionConflictError } from 'src/domain/artifacts/application/artifacts.errors';
import { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import { isUniqueConstraintViolation } from './unique-constraint.util';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class LocalArtifactsRepository extends ArtifactsRepository {
  private readonly logger = new Logger(LocalArtifactsRepository.name);

  // TypeORM and mapper dependencies are injected individually by NestJS.

  constructor(
    @InjectRepository(ArtifactRecord)
    private readonly artifactRepo: Repository<ArtifactRecord>,
    @InjectRepository(DocumentArtifactRecord)
    private readonly documentArtifactRepo: Repository<DocumentArtifactRecord>,
    @InjectRepository(ArtifactVersionRecord)
    private readonly versionRepo: Repository<ArtifactVersionRecord>,
    private readonly artifactMapper: ArtifactMapper,
    private readonly versionMapper: ArtifactVersionMapper,
  ) {
    super();
  }

  async create(artifact: Artifact): Promise<Artifact> {
    this.logger.log(
      {
        id: artifact.id,
        type: artifact.type,
      },
      'create',
    );
    const record = this.artifactMapper.toRecord(artifact);
    const saved = await this.artifactRepo.save(record);
    return this.artifactMapper.toDomain(saved);
  }

  async findById(id: UUID, userId: UUID): Promise<Artifact | null> {
    const record = await this.artifactRepo.findOne({
      where: { id, userId },
    });
    return record ? this.artifactMapper.toDomain(record) : null;
  }

  async findByThreadId(threadId: UUID, userId: UUID): Promise<Artifact[]> {
    const records = await this.artifactRepo.find({
      where: { threadId, userId },
      order: { createdAt: 'ASC' },
    });
    return records.map((r) => this.artifactMapper.toDomain(r));
  }

  async findByWorkspaceId(
    workspaceId: UUID,
    userId: UUID,
    options: ArtifactsByWorkspaceListOptions,
  ): Promise<Paginated<Artifact>> {
    const queryBuilder = this.artifactRepo
      .createQueryBuilder('artifact')
      .innerJoin('artifact.thread', 'thread')
      .where('artifact.userId = :userId', { userId })
      .andWhere('thread.workspaceId = :workspaceId', { workspaceId })
      .andWhere('artifact.type IN (:...artifactTypes)', {
        artifactTypes: Object.values(ArtifactType),
      });

    if (options.search) {
      queryBuilder.andWhere('artifact.title ILIKE :search', {
        search: `%${options.search}%`,
      });
    }
    if (options.type) {
      queryBuilder.andWhere('artifact.type = :artifactType', {
        artifactType: options.type,
      });
    }

    const [records, total] = await queryBuilder
      .orderBy('artifact.updatedAt', 'DESC')
      .addOrderBy('artifact.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) => this.artifactMapper.toDomain(record)),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }

  async findByIdWithVersions(id: UUID, userId: UUID): Promise<Artifact | null> {
    const record = await this.artifactRepo.findOne({
      where: { id, userId },
      relations: { versions: true },
      order: { versions: { versionNumber: 'ASC' } },
    });
    return record ? this.artifactMapper.toDomain(record) : null;
  }

  async addVersion(version: ArtifactVersion): Promise<ArtifactVersion> {
    this.logger.log(
      {
        artifactId: version.artifactId,
        versionNumber: version.versionNumber,
      },
      'addVersion',
    );
    const record = this.versionMapper.toRecord(version);
    const saved = await this.versionRepo.save(record);
    return this.versionMapper.toDomain(saved);
  }

  async updateCurrentVersionNumber(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<void> {
    await this.artifactRepo.update(
      { id: artifactId },
      { currentVersionNumber: versionNumber },
    );
  }

  async updateLetterheadId(
    artifactId: UUID,
    letterheadId: UUID | null,
  ): Promise<void> {
    await this.documentArtifactRepo.update(
      { id: artifactId },
      { letterheadId, updatedAt: new Date() },
    );
  }

  @Transactional()
  async addVersionAndUpdateArtifact(params: {
    version: ArtifactVersion;
    expectedCurrentVersionNumber: number;
    letterheadId?: UUID | null;
  }): Promise<ArtifactVersion> {
    const { version, expectedCurrentVersionNumber, letterheadId } = params;

    this.logVersionUpdate(params);

    try {
      const record = this.versionMapper.toRecord(version);
      const saved = await this.versionRepo.save(record);
      const createdVersion = this.versionMapper.toDomain(saved);

      const result =
        letterheadId === undefined
          ? await this.artifactRepo.update(
              {
                id: version.artifactId,
                currentVersionNumber: expectedCurrentVersionNumber,
              },
              {
                currentVersionNumber: version.versionNumber,
                updatedAt: new Date(),
              },
            )
          : await this.documentArtifactRepo.update(
              {
                id: version.artifactId,
                currentVersionNumber: expectedCurrentVersionNumber,
              },
              {
                currentVersionNumber: version.versionNumber,
                letterheadId,
                updatedAt: new Date(),
              },
            );

      if (result.affected !== 1) {
        throw new ArtifactVersionConflictError(version.artifactId);
      }

      return createdVersion;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ArtifactVersionConflictError(version.artifactId);
      }
      throw error;
    }
  }

  private logVersionUpdate(params: {
    version: ArtifactVersion;
    expectedCurrentVersionNumber: number;
    letterheadId?: UUID | null;
  }): void {
    this.logger.log(
      {
        artifactId: params.version.artifactId,
        versionNumber: params.version.versionNumber,
        expectedCurrentVersionNumber: params.expectedCurrentVersionNumber,
        shouldUpdateLetterhead: params.letterheadId !== undefined,
      },
      'addVersionAndUpdateArtifact',
    );
  }

  async delete(id: UUID): Promise<void> {
    await this.artifactRepo.delete({ id });
  }
}
