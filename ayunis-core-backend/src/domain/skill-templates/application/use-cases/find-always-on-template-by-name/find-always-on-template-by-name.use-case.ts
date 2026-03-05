import { Injectable } from '@nestjs/common';
import { FindActiveAlwaysOnTemplatesUseCase } from '../find-active-always-on-templates/find-active-always-on-templates.use-case';
import { FindActiveAlwaysOnTemplatesQuery } from '../find-active-always-on-templates/find-active-always-on-templates.query';
import { FindAlwaysOnTemplateByNameQuery } from './find-always-on-template-by-name.query';
import { SkillTemplate } from '../../../domain/skill-template.entity';

@Injectable()
export class FindAlwaysOnTemplateByNameUseCase {
  constructor(
    private readonly findActiveAlwaysOnTemplatesUseCase: FindActiveAlwaysOnTemplatesUseCase,
  ) {}

  async execute(
    query: FindAlwaysOnTemplateByNameQuery,
  ): Promise<SkillTemplate | null> {
    const templates = await this.findActiveAlwaysOnTemplatesUseCase.execute(
      new FindActiveAlwaysOnTemplatesQuery(),
    );

    return templates.find((t) => t.name === query.name) ?? null;
  }
}
