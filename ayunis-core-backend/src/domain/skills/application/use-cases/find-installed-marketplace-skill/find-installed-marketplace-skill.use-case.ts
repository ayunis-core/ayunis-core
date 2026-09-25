import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { FindInstalledMarketplaceSkillQuery } from './find-installed-marketplace-skill.query';

@Injectable()
export class FindInstalledMarketplaceSkillUseCase {
  private readonly logger = new Logger(
    FindInstalledMarketplaceSkillUseCase.name,
  );

  constructor(
    private readonly repository: SkillRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: FindInstalledMarketplaceSkillQuery,
  ): Promise<PersonalSkill | null> {
    this.logger.log(
      { marketplaceIdentifier: query.marketplaceIdentifier },
      'execute',
    );
    const { userId } = getRequiredUserContext(this.context);
    return this.repository.findPersonalByMarketplaceIdentifier(
      userId,
      query.marketplaceIdentifier,
    );
  }
}
