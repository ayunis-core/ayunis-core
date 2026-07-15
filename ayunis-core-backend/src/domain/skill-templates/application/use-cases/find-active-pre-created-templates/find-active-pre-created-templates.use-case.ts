import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { PreCreatedCopySkillTemplate } from '../../../domain/pre-created-copy-skill-template.entity';
import { DistributionMode } from '../../../domain/distribution-mode.enum';
import { FindActivePreCreatedTemplatesQuery } from './find-active-pre-created-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';

@Injectable()
export class FindActivePreCreatedTemplatesUseCase {
  private readonly logger = new Logger(
    FindActivePreCreatedTemplatesUseCase.name,
  );

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: FindActivePreCreatedTemplatesQuery,
  ): Promise<PreCreatedCopySkillTemplate[]> {
    this.logger.log('Finding active pre-created copy templates');

    return await this.skillTemplateRepository.findActiveByMode<PreCreatedCopySkillTemplate>(
      DistributionMode.PRE_CREATED_COPY,
    );
  }
}
