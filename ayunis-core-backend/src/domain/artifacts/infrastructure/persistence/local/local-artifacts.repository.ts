import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';

import { ArtifactsRepository } from '../../../application/ports/artifacts-repository.port';
import { ArtifactVersionConflictError } from '../../../application/artifacts.errors';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import { isUniqueConstraintViolation } from './unique-constraint.util';

@Injectable()
export class LocalArtifactsRepository extends ArtifactsRepository {
  private readonly logger = new Logger(LocalArtifactsRepository.name);

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
    this.logger.log('create', {
      id: artifact.id,
      title: artifact.title,
      type: artifact.type,
    });
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

  async findByIdWithVersions(id: UUID, userId: UUID): Promise<Artifact | null> {
    const record = await this.artifactRepo.findOne({
      where: { id, userId },
      relations: { versions: true },
      order: { versions: { versionNumber: 'ASC' } },
    });
    return record ? this.artifactMapper.toDomain(record) : null;
  }

  async addVersion(version: ArtifactVersion): Promise<ArtifactVersion> {
    this.logger.log('addVersion', {
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
    });
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

    this.logger.log('addVersionAndUpdateArtifact', {
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
      expectedCurrentVersionNumber,
      shouldUpdateLetterhead: letterheadId !== undefined,
    });

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

  async delete(id: UUID): Promise<void> {
    await this.artifactRepo.delete({ id });
  }
}
