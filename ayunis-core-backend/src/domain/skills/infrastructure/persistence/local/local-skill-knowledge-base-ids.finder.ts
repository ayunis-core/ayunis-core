import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { EntityManager } from 'typeorm';
import { SkillRecord } from './schema/skill.record';

@Injectable()
export class LocalSkillKnowledgeBaseIdsFinder {
  async findSkillsByKnowledgeBase(
    manager: EntityManager,
    knowledgeBaseId: UUID,
  ): Promise<SkillRecord[]> {
    return manager
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
      .leftJoinAndSelect('skill.knowledgeBases', 'knowledgeBases')
      .getMany();
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
