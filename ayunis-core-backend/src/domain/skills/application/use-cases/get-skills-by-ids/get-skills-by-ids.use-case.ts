import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetSkillsByIdsQuery } from './get-skills-by-ids.query';

@Injectable()
export class GetSkillsByIdsUseCase {
  private readonly logger = new Logger(GetSkillsByIdsUseCase.name);

  constructor(private readonly skillRepository: SkillRepository) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: GetSkillsByIdsQuery): Promise<Skill[]> {
    this.logger.log({ count: query.skillIds.length }, 'getSkillsByIds');
    if (query.skillIds.length === 0) return [];
    return this.skillRepository.findByIds(query.skillIds);
  }
}
