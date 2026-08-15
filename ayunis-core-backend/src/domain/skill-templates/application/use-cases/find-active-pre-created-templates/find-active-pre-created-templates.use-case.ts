import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { PreCreatedCopySkillTemplate } from 'src/domain/skill-templates/domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from 'src/domain/skill-templates/domain/distribution-mode.enum';
import { FindActivePreCreatedTemplatesQuery } from './find-active-pre-created-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindActivePreCreatedTemplatesUseCase {
  constructor(
    @InjectPinoLogger(FindActivePreCreatedTemplatesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: FindActivePreCreatedTemplatesQuery,
  ): Promise<PreCreatedCopySkillTemplate[]> {
    this.logger.info('Finding active pre-created copy templates');
    try {
      return await this.skillTemplateRepository.findActiveByMode<PreCreatedCopySkillTemplate>(
        DistributionMode.PRE_CREATED_COPY,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding active pre-created templates',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
