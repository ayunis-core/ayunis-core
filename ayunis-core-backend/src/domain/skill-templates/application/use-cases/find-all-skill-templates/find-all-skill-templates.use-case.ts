import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from 'src/domain/skill-templates/application/ports/skill-template.repository';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { FindAllSkillTemplatesQuery } from './find-all-skill-templates.query';
import { UnexpectedSkillTemplateError } from 'src/domain/skill-templates/application/skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindAllSkillTemplatesUseCase {
  private readonly logger = new Logger(FindAllSkillTemplatesUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: FindAllSkillTemplatesQuery): Promise<SkillTemplate[]> {
    this.logger.log('Finding all skill templates');
    try {
      return await this.skillTemplateRepository.findAll();
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding all skill templates',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
