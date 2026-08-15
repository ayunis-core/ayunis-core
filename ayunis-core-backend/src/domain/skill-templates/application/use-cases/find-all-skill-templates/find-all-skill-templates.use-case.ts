import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillTemplateRepository } from '../../ports/skill-template.repository';
import { SkillTemplate } from 'src/domain/skill-templates/domain/skill-template.entity';
import { FindAllSkillTemplatesQuery } from './find-all-skill-templates.query';
import { UnexpectedSkillTemplateError } from '../../skill-templates.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class FindAllSkillTemplatesUseCase {
  constructor(
    @InjectPinoLogger(FindAllSkillTemplatesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly skillTemplateRepository: SkillTemplateRepository,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_query: FindAllSkillTemplatesQuery): Promise<SkillTemplate[]> {
    this.logger.info('Finding all skill templates');
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
