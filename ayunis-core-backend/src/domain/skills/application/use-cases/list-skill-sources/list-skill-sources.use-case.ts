import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { ListSkillSourcesQuery } from './list-skill-sources.query';

@Injectable()
export class ListSkillSourcesUseCase {
  private readonly logger = new Logger(ListSkillSourcesUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly getSourcesByIds: GetSourcesByIdsUseCase,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: ListSkillSourcesQuery): Promise<Source[]> {
    this.logger.log({ skillId: query.skillId }, 'Listing sources for skill');
    const skill = await this.repository.findById(query.skillId);
    if (!skill) throw new SkillNotFoundError(query.skillId);
    await this.authorization.requireRead(skill);
    if (!skill.sourceIds.length) return [];
    return this.getSourcesByIds.execute(
      new GetSourcesByIdsQuery(skill.sourceIds),
    );
  }
}
