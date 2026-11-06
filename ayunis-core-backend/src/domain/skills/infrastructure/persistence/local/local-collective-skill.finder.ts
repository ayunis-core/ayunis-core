import { Injectable } from '@nestjs/common';
import {
  Brackets,
  type EntityManager,
  type WhereExpressionBuilder,
} from 'typeorm';
import type { ReadableSkillOwners } from 'src/domain/skills/application/models/skill-owner';
import type { CollectiveOwnerRef } from 'src/domain/skills/application/ports/skill.repository';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { SkillMapper } from './mappers/skill.mapper';
import { SKILL_RELATIONS } from './local-skill-relations.repository-helper';
import { SkillRecord } from './schema/skill.record';

type CollectiveOwnerFilter = Pick<ReadableSkillOwners, 'teamIds'> &
  Partial<Pick<ReadableSkillOwners, 'orgId'>>;

export function whereCollectiveOwner(
  query: WhereExpressionBuilder,
  owners: CollectiveOwnerFilter,
): WhereExpressionBuilder {
  query.where('skill.orgId = :ownerOrgId', {
    ownerOrgId: owners.orgId ?? null,
  });
  if (owners.teamIds.length > 0) {
    query.orWhere('skill.teamId IN (:...ownerTeamIds)', {
      ownerTeamIds: owners.teamIds,
    });
  }
  return query;
}

@Injectable()
export class LocalCollectiveSkillFinder {
  constructor(private readonly mapper: SkillMapper) {}

  async findAll(
    manager: EntityManager,
    owners: CollectiveOwnerFilter,
    filter: { onlyActive?: boolean; name?: string } = {},
  ): Promise<CollectiveSkill[]> {
    const query = manager
      .getRepository(SkillRecord)
      .createQueryBuilder('skill')
      .where(new Brackets((owner) => whereCollectiveOwner(owner, owners)));
    if (filter.onlyActive) query.andWhere('skill.isActive = true');
    if (filter.name !== undefined) {
      query.andWhere('skill.name = :name', { name: filter.name });
    }
    for (const relation of SKILL_RELATIONS) {
      query.leftJoinAndSelect(`skill.${relation}`, relation);
    }
    // Run assembly and name-based activation must resolve slug collisions to
    // the same skill, so both read this order.
    query.orderBy('skill.createdAt', 'ASC').addOrderBy('skill.id', 'ASC');
    const records = await query.getMany();
    return records.map((record) => this.toCollective(record));
  }

  async findByName(
    manager: EntityManager,
    name: string,
    owner: CollectiveOwnerRef,
  ): Promise<CollectiveSkill | null> {
    const record = await manager.getRepository(SkillRecord).findOne({
      where: { name, ...owner },
      relations: [...SKILL_RELATIONS],
    });
    return record ? this.toCollective(record) : null;
  }

  private toCollective(record: SkillRecord): CollectiveSkill {
    const skill = this.mapper.toDomain(record);
    if (skill instanceof TeamSkill || skill instanceof OrgSkill) return skill;
    throw new Error(`Expected team or organization skill ${record.id}`);
  }
}
