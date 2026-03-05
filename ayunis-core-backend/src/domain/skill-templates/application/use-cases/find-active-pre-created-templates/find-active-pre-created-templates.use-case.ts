import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { FindActivePreCreatedTemplatesQuery } from './find-active-pre-created-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindActivePreCreatedTemplatesUseCase {
  private readonly logger = new Logger(
    FindActivePreCreatedTemplatesUseCase.name,
  );

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: FindActivePreCreatedTemplatesQuery,
  ): Promise<PreCreatedCopySkillTemplate[]> {
    this.logger.log('Finding active pre-created copy templates');
    try {
      return (await this.skillTemplateRepository.findActiveByMode(
        DistributionMode.PRE_CREATED_COPY,
      )) as PreCreatedCopySkillTemplate[];
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding active pre-created templates', {
        error: error as Error,
      });
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
