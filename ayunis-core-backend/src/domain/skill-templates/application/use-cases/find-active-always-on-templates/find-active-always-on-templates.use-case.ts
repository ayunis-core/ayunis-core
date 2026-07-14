import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { FindActiveAlwaysOnTemplatesQuery } from './find-active-always-on-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class FindActiveAlwaysOnTemplatesUseCase {
  private readonly logger = new Logger(FindActiveAlwaysOnTemplatesUseCase.name);
  private cachedTemplates: SkillTemplate[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: FindActiveAlwaysOnTemplatesQuery,
  ): Promise<SkillTemplate[]> {
    const now = Date.now();
    if (this.cachedTemplates !== null && now < this.cacheExpiresAt) {
      return this.cachedTemplates;
    }

    const templates = await this.skillTemplateRepository.findActiveByMode(
      DistributionMode.ALWAYS_ON,
    );
    this.cachedTemplates = templates;
    this.cacheExpiresAt = now + CACHE_TTL_MS;
    return templates;
  }

  /** Clears the in-memory cache (useful for testing). */
  clearCache(): void {
    this.cachedTemplates = null;
    this.cacheExpiresAt = 0;
  }
}
