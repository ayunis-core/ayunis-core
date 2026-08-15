import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { DistributionMode } from 'src/domain/skill-templates/domain/distribution-mode.enum';
import { FindActiveAlwaysOnTemplatesQuery } from './find-active-always-on-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class FindActiveAlwaysOnTemplatesUseCase {
  private cachedTemplates: SkillTemplate[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    @InjectPinoLogger(FindActiveAlwaysOnTemplatesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: FindActiveAlwaysOnTemplatesQuery,
  ): Promise<SkillTemplate[]> {
    const now = Date.now();
    if (this.cachedTemplates !== null && now < this.cacheExpiresAt) {
      return this.cachedTemplates;
    }

    try {
      const templates = await this.skillTemplateRepository.findActiveByMode(
        DistributionMode.ALWAYS_ON,
      );
      this.cachedTemplates = templates;
      this.cacheExpiresAt = now + CACHE_TTL_MS;
      return templates;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding active always-on templates',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }

  /** Clears the in-memory cache (useful for testing). */
  clearCache(): void {
    this.cachedTemplates = null;
    this.cacheExpiresAt = 0;
  }
}
