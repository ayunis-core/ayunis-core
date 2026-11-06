import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { SkillRecord } from './schema/skill.record';

@Injectable()
export class LocalSkillKnowledgeBaseIdsFinder {
  async findKnowledgeBaseIdsBySkillIds(
    skillIds: UUID[],
    manager: EntityManager,
  ): Promise<UUID[]> {
    if (skillIds.length === 0) return [];

    const rows = await manager
      .createQueryBuilder()
      .select('skb."knowledgeBasesId"', 'knowledgeBaseId')
      .from('skill_knowledge_bases', 'skb')
      .innerJoin('skills', 'skill', 'skill.id = skb."skillsId"')
      .innerJoin(
        'knowledge_bases',
        'knowledgeBase',
        '"knowledgeBase".id = skb."knowledgeBasesId"',
      )
      .where('skill.id IN (:...skillIds)', { skillIds })
      .andWhere('"knowledgeBase"."userId" = skill."userId"')
      .distinct(true)
      .getRawMany<{ knowledgeBaseId: UUID }>();

    return rows.map((row) => row.knowledgeBaseId);
  }

  /** Without `ownerIds`, returns the skills of every owner. */
  async findSkillsByKnowledgeBase(
    manager: EntityManager,
    knowledgeBaseId: UUID,
    ownerIds?: UUID[],
  ): Promise<SkillRecord[]> {
    if (ownerIds?.length === 0) return [];
    const query = manager
      .getRepository(SkillRecord)
      .createQueryBuilder('skill')
      .innerJoin(
        'skill_knowledge_bases',
        'skb',
        'skb."skillsId" = skill.id AND skb."knowledgeBasesId" = :kbId',
        { kbId: knowledgeBaseId },
      )
      .leftJoinAndSelect('skill.sources', 'sources')
      .leftJoinAndSelect('skill.mcpIntegrations', 'mcpIntegrations')
      .leftJoinAndSelect('skill.knowledgeBases', 'knowledgeBases');
    if (ownerIds) {
      query.where('skill.userId IN (:...ownerIds)', { ownerIds });
    }
    return query.getMany();
  }

  async removeKnowledgeBaseFromSkills(
    manager: EntityManager,
    knowledgeBaseId: UUID,
    skillIds: UUID[],
  ): Promise<void> {
    if (skillIds.length === 0) return;
    await manager
      .createQueryBuilder()
      .delete()
      .from('skill_knowledge_bases')
      .where('"knowledgeBasesId" = :kbId', { kbId: knowledgeBaseId })
      .andWhere('"skillsId" IN (:...skillIds)', { skillIds })
      .execute();
  }
}
