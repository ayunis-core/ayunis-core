import { Injectable, Logger } from '@nestjs/common';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { FindOneSkillTemplateQuery } from './find-one-skill-template.query';
import { SkillTemplate } from '../../../domain/skill-template.entity';
import {
  SkillTemplateNotFoundError,
  UnexpectedSkillTemplateError,
} from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindOneSkillTemplateUseCase {
  private readonly logger = new Logger(FindOneSkillTemplateUseCase.name);

  constructor(
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  async execute(query: FindOneSkillTemplateQuery): Promise<SkillTemplate> {
    this.logger.log('Finding skill template', { id: query.id });
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
      this.logger.error('Error finding skill template', {
        error: error as Error,
      });
      throw new UnexpectedSkillTemplateError(error);
    }
  }
}
