import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindSkillsByKnowledgeBaseAndOwnersQuery } from './find-skills-by-knowledge-base-and-owners.query';
import type { Skill } from '../../../domain/skill.entity';

@Injectable()
export class FindSkillsByKnowledgeBaseAndOwnersUseCase {
  private readonly logger = new Logger(
    FindSkillsByKnowledgeBaseAndOwnersUseCase.name,
  );

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
  ) {}

  async execute(
    query: FindSkillsByKnowledgeBaseAndOwnersQuery,
  ): Promise<Skill[]> {
    this.logger.log('execute', {
      knowledgeBaseId: query.knowledgeBaseId,
      ownerCount: query.ownerIds.length,
    });

    if (query.ownerIds.length === 0) {
      return [];
    }

    return this.skillRepository.findSkillsByKnowledgeBaseAndOwners(
      query.knowledgeBaseId,
      query.ownerIds,
    );
  }
}
