import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { GetSkillsByIdsQuery } from './get-skills-by-ids.query';

@Injectable()
export class GetSkillsByIdsUseCase {
  constructor(
    @InjectPinoLogger(GetSkillsByIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillRepository: SkillRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: GetSkillsByIdsQuery): Promise<Skill[]> {
    this.logger.info({ count: query.skillIds.length }, 'getSkillsByIds');
    if (query.skillIds.length === 0) return [];
    return this.skillRepository.findByIds(query.skillIds);
  }
}
