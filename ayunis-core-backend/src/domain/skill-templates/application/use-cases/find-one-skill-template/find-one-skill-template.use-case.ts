import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from 'src/domain/skill-templates/application/ports/skill-template.repository';
import { FindOneSkillTemplateQuery } from './find-one-skill-template.query';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from 'src/domain/skill-templates/application/skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindOneSkillTemplateUseCase {
  private readonly logger = new Logger(FindOneSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(query: FindOneSkillTemplateQuery): Promise<SkillTemplate> {
    this.logger.log({ id: query.id }, 'Finding skill template');
    try {
      const skillTemplate = await this.skillTemplateRepository.findOne(
        query.id,
      );
      if (!skillTemplate) {
        throw new SkillTemplateNotFoundError(query.id);
      }
      return skillTemplate;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding skill template',
      );
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
