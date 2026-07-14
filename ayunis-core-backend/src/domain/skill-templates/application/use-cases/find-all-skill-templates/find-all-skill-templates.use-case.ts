import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import { FindAllSkillTemplatesQuery } from './find-all-skill-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';

@Injectable()
export class FindAllSkillTemplatesUseCase {
  private readonly logger = new Logger(FindAllSkillTemplatesUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillTemplateError)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: FindAllSkillTemplatesQuery): Promise<SkillTemplate[]> {
    this.logger.log('Finding all skill templates');

    return await this.skillTemplateRepository.findAll();
  }
}
