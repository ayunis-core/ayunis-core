import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { FindOneSkillTemplateQuery } from './find-one-skill-template.query';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';

@Injectable()
export class FindOneSkillTemplateUseCase {
  private readonly logger = new Logger(FindOneSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  async execute(query: FindOneSkillTemplateQuery): Promise<SkillTemplate> {
    this.logger.log('Finding skill template', { id: query.id });

    const skillTemplate = await this.skillTemplateRepository.findOne(query.id);
    if (!skillTemplate) {
      throw new SkillTemplateNotFoundError(query.id);
    }
    return skillTemplate;
  }
}
