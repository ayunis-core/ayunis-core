import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import type {
  DefaultModelSelection,
  DefaultModelSelectionOwner,
} from 'src/domain/models/domain/default-model-selection';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import {
  DefaultModelSelectionKind,
  DefaultModelSelectionRecord,
} from './schema/default-model-selection.record';

@Injectable()
export class LocalDefaultModelSelectionsRepository extends DefaultModelSelectionsRepository {
  constructor(
    @InjectRepository(DefaultModelSelectionRecord)
    private readonly defaultRepository: Repository<DefaultModelSelectionRecord>,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<DefaultModelSelectionRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(DefaultModelSelectionRecord) ??
      this.defaultRepository
    );
  }

  async find(
    owner: DefaultModelSelectionOwner,
  ): Promise<DefaultModelSelection | null> {
    const record = await this.repository.findOne({
      where: owner,
      relations: { permittedModel: true },
    });
    return record ? this.toDomain(record) : null;
  }

  async findForTeams(teamIds: UUID[]): Promise<DefaultModelSelection[]> {
    if (teamIds.length === 0) return [];
    const records = await this.repository.find({
      where: { teamId: In(teamIds) },
      relations: { permittedModel: true },
    });
    return records
      .map((record) => this.toDomain(record))
      .filter((s): s is DefaultModelSelection => s !== null);
  }

  setModel(
    owner: DefaultModelSelectionOwner,
    permittedModelId: UUID,
  ): Promise<void> {
    return this.upsert(owner, {
      kind: DefaultModelSelectionKind.MODEL,
      permittedModelId,
      mode: null,
    });
  }

  setMode(owner: DefaultModelSelectionOwner, mode: ModelMode): Promise<void> {
    return this.upsert(owner, {
      kind: DefaultModelSelectionKind.MODE,
      permittedModelId: null,
      mode,
    });
  }

  async clear(owner: DefaultModelSelectionOwner): Promise<void> {
    await this.repository.delete(owner);
  }

  async deleteByPermittedModelIds(permittedModelIds: UUID[]): Promise<void> {
    if (permittedModelIds.length === 0) return;
    await this.repository.delete({ permittedModelId: In(permittedModelIds) });
  }

  async deleteByCatalogModelId(catalogModelId: UUID): Promise<void> {
    const permits = this.repository.manager
      .createQueryBuilder(PermittedModelRecord, 'permit')
      .select('permit.id')
      .where('permit.modelId = :catalogModelId', { catalogModelId });
    await this.repository
      .createQueryBuilder()
      .delete()
      .where(`"permittedModelId" IN (${permits.getQuery()})`)
      .setParameters(permits.getParameters())
      .execute();
  }

  /** One statement per write: concurrent writes for one owner cannot collide. */
  private async upsert(
    owner: DefaultModelSelectionOwner,
    selection: Pick<
      DefaultModelSelectionRecord,
      'kind' | 'permittedModelId' | 'mode'
    >,
  ): Promise<void> {
    const ownerColumn = Object.keys(owner)[0];
    await this.repository
      .createQueryBuilder()
      .insert()
      .values({
        id: randomUUID(),
        ...owner,
        ...selection,
        updatedAt: new Date(),
      })
      .orUpdate(
        ['kind', 'permittedModelId', 'mode', 'updatedAt'],
        [ownerColumn],
        {
          indexPredicate: `"${ownerColumn}" IS NOT NULL`,
        },
      )
      .execute();
  }

  private toDomain(
    record: DefaultModelSelectionRecord,
  ): DefaultModelSelection | null {
    if (record.kind === DefaultModelSelectionKind.MODE && record.mode) {
      return { kind: 'mode', mode: record.mode };
    }
    if (!record.permittedModel) return null;
    const permittedModel = this.permittedModelMapper.toDomain(
      record.permittedModel,
    );
    return permittedModel instanceof PermittedLanguageModel
      ? { kind: 'model', permittedModel }
      : null;
  }
}
