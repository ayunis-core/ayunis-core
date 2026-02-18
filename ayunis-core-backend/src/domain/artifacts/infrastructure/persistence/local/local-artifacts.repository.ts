import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';

import { ArtifactsRepository } from '../../../application/ports/artifacts-repository.port';
import { Artifact } from '../../../domain/artifact.entity';
import { ArtifactVersion } from '../../../domain/artifact-version.entity';
import { ArtifactRecord } from './schema/artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';

@Injectable()
export class LocalArtifactsRepository extends ArtifactsRepository {
  private readonly logger = new Logger(LocalArtifactsRepository.name);

  constructor(
    @InjectRepository(ArtifactRecord)
    private readonly artifactRepo: Repository<ArtifactRecord>,
    @InjectRepository(ArtifactVersionRecord)
    private readonly versionRepo: Repository<ArtifactVersionRecord>,
    private readonly artifactMapper: ArtifactMapper,
    private readonly versionMapper: ArtifactVersionMapper,
  ) {
    super();
  }

  async create(artifact: Artifact): Promise<Artifact> {
    this.logger.log('create', { id: artifact.id, title: artifact.title });
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

  async delete(id: UUID): Promise<void> {
    await this.artifactRepo.delete({ id });
  }
}
