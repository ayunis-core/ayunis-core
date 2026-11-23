import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager, FindOptionsWhere } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional, TransactionHost } from '@nestjs-cls/transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';

import {
  ArtifactLookupOptions,
  ArtifactsByWorkspaceListOptions,
  ArtifactsRepository,
} from 'src/domain/artifacts/application/ports/artifacts-repository.port';
import { ArtifactVersionConflictError } from 'src/domain/artifacts/application/artifacts.errors';
import { Artifact } from 'src/domain/artifacts/domain/artifact.entity';
import { ArtifactVersion } from 'src/domain/artifacts/domain/artifact-version.entity';
import { ArtifactPiiMask } from 'src/domain/artifacts/domain/artifact-pii-mask.entity';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import type { ArtifactOwner } from 'src/domain/artifacts/domain/artifact-owner';
import { ArtifactRecord } from './schema/artifact.record';
import { DocumentArtifactRecord } from './schema/document-artifact.record';
import { ArtifactVersionRecord } from './schema/artifact-version.record';
import { ThreadArtifactRecord } from './schema/thread-artifact.record';
import { ArtifactPiiMaskRecord } from './schema/artifact-pii-mask.record';
import { ArtifactMapper } from './mappers/artifact.mapper';
import { ArtifactVersionMapper } from './mappers/artifact-version.mapper';
import { ArtifactPiiMaskMapper } from './mappers/artifact-pii-mask.mapper';
import { isUniqueConstraintViolation } from 'src/common/util/unique-constraint.util';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { memberWorkspace } from 'src/domain/workspaces/infrastructure/persistence/local/queries/member-workspace';

@Injectable()
export class LocalArtifactsRepository extends ArtifactsRepository {
  private readonly logger = new Logger(LocalArtifactsRepository.name);

  constructor(
    @InjectRepository(ArtifactRecord)
    private readonly defaultArtifactRepo: Repository<ArtifactRecord>,
    @InjectRepository(DocumentArtifactRecord)
    private readonly defaultDocumentArtifactRepo: Repository<DocumentArtifactRecord>,
    @InjectRepository(ArtifactVersionRecord)
    private readonly defaultVersionRepo: Repository<ArtifactVersionRecord>,
    @InjectRepository(ThreadArtifactRecord)
    private readonly defaultThreadLinkRepo: Repository<ThreadArtifactRecord>,
    @InjectRepository(ArtifactPiiMaskRecord)
    private readonly defaultPiiMaskRepo: Repository<ArtifactPiiMaskRecord>,
    private readonly artifactMapper: ArtifactMapper,
    private readonly versionMapper: ArtifactVersionMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get artifactRepo(): Repository<ArtifactRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(ArtifactRecord) ?? this.defaultArtifactRepo;
  }

  private get documentArtifactRepo(): Repository<DocumentArtifactRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(DocumentArtifactRecord) ??
      this.defaultDocumentArtifactRepo
    );
  }

  private get versionRepo(): Repository<ArtifactVersionRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ArtifactVersionRecord) ?? this.defaultVersionRepo
    );
  }

  private get threadLinkRepo(): Repository<ThreadArtifactRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ThreadArtifactRecord) ?? this.defaultThreadLinkRepo
    );
  }

  private get piiMaskRepo(): Repository<ArtifactPiiMaskRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ArtifactPiiMaskRecord) ?? this.defaultPiiMaskRepo
    );
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

  async addThreadLink(threadId: UUID, artifactId: UUID): Promise<void> {
    this.logger.log({ threadId, artifactId }, 'addThreadLink');
    await this.threadLinkRepo.insert({ threadId, artifactId });
  }

  /**
   * A personal artifact is accessible to its owner, a workspace artifact to
   * the workspace's members. Through a chat only the chat's user finds it.
   */
  private accessibleTo(
    userId: UUID,
    options: ArtifactLookupOptions = {},
  ): FindOptionsWhere<ArtifactRecord>[] {
    const filters: FindOptionsWhere<ArtifactRecord> = {
      ...(options.linkedThreadId && {
        threadLinks: { threadId: options.linkedThreadId, thread: { userId } },
      }),
      ...(options.isAnonymous !== undefined && {
        isAnonymous: options.isAnonymous,
      }),
    };
    return [
      { userId, ...filters },
      { workspaceId: memberWorkspace(userId), ...filters },
    ];
  }

  private accessibleById(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): FindOptionsWhere<ArtifactRecord>[] {
    return this.accessibleTo(userId, options).map((where) => ({
      id,
      ...where,
    }));
  }

  async findById(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): Promise<Artifact | null> {
    const record = await this.artifactRepo.findOne({
      where: this.accessibleById(id, userId, options),
    });
    return record ? this.artifactMapper.toDomain(record) : null;
  }

  async findByThreadId(
    threadId: UUID,
    userId: UUID,
    options: Pick<ArtifactLookupOptions, 'isAnonymous'> = {},
  ): Promise<Artifact[]> {
    const records = await this.artifactRepo.find({
      where: this.accessibleTo(userId, {
        linkedThreadId: threadId,
        isAnonymous: options.isAnonymous,
      }),
      order: { threadLinks: { createdAt: 'ASC' }, createdAt: 'ASC' },
    });
    if (options.isAnonymous) {
      await this.attachPiiMasks(records);
    }
    return records.map((r) => this.artifactMapper.toDomain(r));
  }

  private async attachPiiMasks(records: ArtifactRecord[]): Promise<void> {
    if (records.length === 0) return;
    const masks = await this.piiMaskRepo.find({
      where: { artifactId: In(records.map((record) => record.id)) },
      order: { category: 'ASC', maskIndex: 'ASC' },
    });
    for (const record of records) {
      record.piiMasks = masks.filter((mask) => mask.artifactId === record.id);
    }
  }

  async findByWorkspaceId(
    workspaceId: UUID,
    options: ArtifactsByWorkspaceListOptions,
  ): Promise<Paginated<Artifact>> {
    const queryBuilder = this.artifactRepo
      .createQueryBuilder('artifact')
      .where('artifact.workspaceId = :workspaceId', { workspaceId })
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

  async deleteThreadLinksNotOwnedBy(
    threadId: UUID,
    owner: ArtifactOwner,
  ): Promise<void> {
    this.logger.log({ threadId, owner }, 'deleteThreadLinksNotOwnedBy');
    const [ownerColumn, ownerId] =
      owner.type === 'personal'
        ? ['userId', owner.userId]
        : ['workspaceId', owner.workspaceId];
    await this.threadLinkRepo.query(
      `DELETE FROM "thread_artifacts" WHERE "threadId" = $1 AND "artifactId" NOT IN (SELECT "id" FROM "artifacts" WHERE "${ownerColumn}" = $2)`,
      [threadId, ownerId],
    );
  }

  async findByIdWithVersions(
    id: UUID,
    userId: UUID,
    options?: ArtifactLookupOptions,
  ): Promise<Artifact | null> {
    const record = await this.artifactRepo.findOne({
      where: this.accessibleById(id, userId, options),
      relations: { versions: true },
      order: { versions: { versionNumber: 'ASC' } },
    });
    if (!record) return null;
    // Loaded apart from the versions: a join would repeat every version's
    // content once per dictionary entry.
    if (record.isAnonymous) {
      record.piiMasks = await this.findPiiMaskRecords(record.id);
    }
    return this.artifactMapper.toDomain(record);
  }

  async findPiiMasks(artifactId: UUID): Promise<ArtifactPiiMask[]> {
    const records = await this.findPiiMaskRecords(artifactId);
    return records.map((record) => ArtifactPiiMaskMapper.toDomain(record));
  }

  private findPiiMaskRecords(
    artifactId: UUID,
  ): Promise<ArtifactPiiMaskRecord[]> {
    return this.piiMaskRepo.find({
      where: { artifactId },
      order: { category: 'ASC', maskIndex: 'ASC' },
    });
  }

  async addPiiMasks(masks: ArtifactPiiMask[]): Promise<void> {
    if (masks.length === 0) return;
    this.logger.log(
      { artifactId: masks[0].artifactId, count: masks.length },
      'addPiiMasks',
    );
    await this.insertPiiMasks(masks);
  }

  private async insertPiiMasks(masks: ArtifactPiiMask[]): Promise<void> {
    if (masks.length === 0) return;
    await this.piiMaskRepo.insert(
      masks.map((mask) => ({
        id: mask.id,
        artifactId: mask.artifactId,
        category: mask.category,
        maskIndex: mask.maskIndex,
        value: mask.value,
        createdAt: mask.createdAt,
      })),
    );
  }

  async findVersion(
    artifactId: UUID,
    versionNumber: number,
  ): Promise<ArtifactVersion | null> {
    const record = await this.versionRepo.findOne({
      where: { artifactId, versionNumber },
    });
    return record ? this.versionMapper.toDomain(record) : null;
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
    piiMasks?: ArtifactPiiMask[];
  }): Promise<ArtifactVersion> {
    const { version, expectedCurrentVersionNumber, letterheadId } = params;

    this.logVersionUpdate(params);

    try {
      await this.insertPiiMasks(params.piiMasks ?? []);
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
    piiMasks?: ArtifactPiiMask[];
  }): void {
    this.logger.log(
      {
        artifactId: params.version.artifactId,
        versionNumber: params.version.versionNumber,
        expectedCurrentVersionNumber: params.expectedCurrentVersionNumber,
        shouldUpdateLetterhead: params.letterheadId !== undefined,
        newPiiMaskCount: params.piiMasks?.length ?? 0,
      },
      'addVersionAndUpdateArtifact',
    );
  }

  async delete(id: UUID): Promise<void> {
    await this.artifactRepo.delete({ id });
  }
}
