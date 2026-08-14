import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';

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
        'knowledgeBase.id = skb."knowledgeBasesId"',
      )
      .where('skill.id IN (:...skillIds)', { skillIds })
      .andWhere('knowledgeBase."userId" = skill."userId"')
      .distinct(true)
      .getRawMany<{ knowledgeBaseId: UUID }>();

    return rows.map((row) => row.knowledgeBaseId);
  }
}
