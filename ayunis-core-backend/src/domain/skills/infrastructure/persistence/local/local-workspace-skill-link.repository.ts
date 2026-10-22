import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import type { Repository } from 'typeorm';
import {
  WorkspaceSkillLinkRepository,
  type PersonalLinkFilter,
  type PersonalSkillLink,
  type WorkspaceSkillLink,
} from 'src/domain/skills/application/ports/workspace-skill-link.repository';
import { WorkspaceSkillLinkRecord } from './schema/workspace-skill-link.record';

@Injectable()
export class LocalWorkspaceSkillLinkRepository extends WorkspaceSkillLinkRepository {
  constructor(
    @InjectRepository(WorkspaceSkillLinkRecord)
    private readonly defaultLinks: Repository<WorkspaceSkillLinkRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get links(): Repository<WorkspaceSkillLinkRecord> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const manager = this.txHost.tx ?? this.defaultLinks.manager;
    return manager.getRepository(WorkspaceSkillLinkRecord);
  }

  async findByWorkspace(workspaceId: UUID): Promise<WorkspaceSkillLink[]> {
    const rows = await this.links.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => this.toLink(row));
  }

  async findBySkill(skillId: UUID): Promise<WorkspaceSkillLink[]> {
    const rows = await this.links.find({ where: { skillId } });
    return rows.map((row) => this.toLink(row));
  }

  async isLinked(workspaceId: UUID, skillId: UUID): Promise<boolean> {
    return this.links.exists({ where: { workspaceId, skillId } });
  }

  async link(
    workspaceId: UUID,
    skillIds: UUID[],
    linkedByUserId: UUID,
  ): Promise<void> {
    if (skillIds.length === 0) return;
    await this.links
      .createQueryBuilder()
      .insert()
      .into(WorkspaceSkillLinkRecord)
      .values(
        skillIds.map((skillId) => ({
          id: randomUUID(),
          workspaceId,
          skillId,
          linkedByUserId,
        })),
      )
      .orIgnore()
      .execute();
  }

  async unlink(workspaceId: UUID, skillId: UUID): Promise<void> {
    await this.links.delete({ workspaceId, skillId });
  }

  async findPersonalLinks(
    filter: PersonalLinkFilter,
  ): Promise<PersonalSkillLink[]> {
    const { workspaceIds, ownerIds } = filter;
    if (workspaceIds?.length === 0 || ownerIds?.length === 0) return [];
    const query = this.links
      .createQueryBuilder('link')
      .innerJoin('link.skill', 'skill')
      .select('link.workspaceId', 'workspaceId')
      .addSelect('link.skillId', 'skillId')
      .addSelect('skill.userId', 'ownerId')
      .where('skill.userId IS NOT NULL');
    if (workspaceIds) {
      query.andWhere('link.workspaceId IN (:...workspaceIds)', {
        workspaceIds,
      });
    }
    if (ownerIds) {
      query.andWhere('skill.userId IN (:...ownerIds)', { ownerIds });
    }
    return query.getRawMany<PersonalSkillLink>();
  }

  async removeMany(
    links: Pick<PersonalSkillLink, 'workspaceId' | 'skillId'>[],
  ): Promise<number> {
    if (links.length === 0) return 0;
    const result = await this.links.delete(
      links.map(({ workspaceId, skillId }) => ({ workspaceId, skillId })),
    );
    return result.affected ?? 0;
  }

  private toLink(row: WorkspaceSkillLinkRecord): WorkspaceSkillLink {
    return {
      workspaceId: row.workspaceId,
      skillId: row.skillId,
      linkedByUserId: row.linkedByUserId,
      linkedAt: row.createdAt,
    };
  }
}
