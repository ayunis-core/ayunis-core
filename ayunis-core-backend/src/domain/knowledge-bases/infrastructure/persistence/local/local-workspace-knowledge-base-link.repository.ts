import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import type { Repository } from 'typeorm';
import {
  WorkspaceKnowledgeBaseLinkRepository,
  type PersonalKnowledgeBaseLink,
  type PersonalKnowledgeBaseLinkFilter,
  type WorkspaceKnowledgeBaseLink,
} from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { WorkspaceKnowledgeBaseLinkRecord } from './schema/workspace-knowledge-base-link.record';

@Injectable()
export class LocalWorkspaceKnowledgeBaseLinkRepository extends WorkspaceKnowledgeBaseLinkRepository {
  constructor(
    @InjectRepository(WorkspaceKnowledgeBaseLinkRecord)
    private readonly defaultRecords: Repository<WorkspaceKnowledgeBaseLinkRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get records(): Repository<WorkspaceKnowledgeBaseLinkRecord> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return (this.txHost.tx ?? this.defaultRecords.manager).getRepository(
      WorkspaceKnowledgeBaseLinkRecord,
    );
  }

  async findByWorkspace(
    workspaceId: UUID,
  ): Promise<WorkspaceKnowledgeBaseLink[]> {
    const rows = await this.records.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
    return rows.map(toKnowledgeBaseLink);
  }

  async findByKnowledgeBase(
    knowledgeBaseId: UUID,
  ): Promise<WorkspaceKnowledgeBaseLink[]> {
    const rows = await this.records.find({ where: { knowledgeBaseId } });
    return rows.map(toKnowledgeBaseLink);
  }

  isLinked(workspaceId: UUID, knowledgeBaseId: UUID): Promise<boolean> {
    return this.records.exists({ where: { workspaceId, knowledgeBaseId } });
  }

  async link(
    workspaceId: UUID,
    knowledgeBaseIds: UUID[],
    linkedByUserId: UUID,
  ): Promise<void> {
    if (knowledgeBaseIds.length === 0) return;
    const values = knowledgeBaseIds.map((knowledgeBaseId) => ({
      id: randomUUID(),
      workspaceId,
      knowledgeBaseId,
      linkedByUserId,
    }));
    await this.records
      .createQueryBuilder()
      .insert()
      .into(WorkspaceKnowledgeBaseLinkRecord)
      .values(values)
      .orIgnore()
      .execute();
  }

  async unlink(workspaceId: UUID, knowledgeBaseId: UUID): Promise<void> {
    await this.records.delete({ workspaceId, knowledgeBaseId });
  }

  async findPersonalLinks(
    filter: PersonalKnowledgeBaseLinkFilter,
  ): Promise<PersonalKnowledgeBaseLink[]> {
    const { workspaceIds, ownerIds } = filter;
    if (workspaceIds?.length === 0 || ownerIds?.length === 0) return [];
    const query = this.records
      .createQueryBuilder('link')
      .innerJoin('link.knowledgeBase', 'knowledgeBase')
      .select('link.workspaceId', 'workspaceId')
      .addSelect('link.knowledgeBaseId', 'knowledgeBaseId')
      .addSelect('knowledgeBase.userId', 'ownerId')
      .where('knowledgeBase.userId IS NOT NULL');
    if (workspaceIds) {
      query.andWhere('link.workspaceId IN (:...workspaceIds)', {
        workspaceIds,
      });
    }
    if (ownerIds) {
      query.andWhere('knowledgeBase.userId IN (:...ownerIds)', { ownerIds });
    }
    return query.getRawMany<PersonalKnowledgeBaseLink>();
  }

  async removeMany(
    links: Pick<PersonalKnowledgeBaseLink, 'workspaceId' | 'knowledgeBaseId'>[],
  ): Promise<number> {
    if (links.length === 0) return 0;
    const result = await this.records.delete(
      links.map(({ workspaceId, knowledgeBaseId }) => ({
        workspaceId,
        knowledgeBaseId,
      })),
    );
    return result.affected ?? 0;
  }
}

function toKnowledgeBaseLink(
  record: WorkspaceKnowledgeBaseLinkRecord,
): WorkspaceKnowledgeBaseLink {
  return {
    workspaceId: record.workspaceId,
    knowledgeBaseId: record.knowledgeBaseId,
    linkedByUserId: record.linkedByUserId,
    linkedAt: record.createdAt,
  };
}
