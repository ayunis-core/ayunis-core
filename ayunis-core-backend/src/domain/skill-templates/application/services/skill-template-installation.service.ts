import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CreateSkillWithUniqueNameUseCase } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import { CreateSkillWithUniqueNameCommand } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.command';
import { FindActivePreCreatedTemplatesUseCase } from '../use-cases/find-active-pre-created-templates/find-active-pre-created-templates.use-case';
import { FindActivePreCreatedTemplatesQuery } from '../use-cases/find-active-pre-created-templates/find-active-pre-created-templates.query';

@Injectable()
export class SkillTemplateInstallationService {
  private readonly logger = new Logger(SkillTemplateInstallationService.name);

  constructor(
    private readonly findActivePreCreatedTemplatesUseCase: FindActivePreCreatedTemplatesUseCase,
    private readonly createSkillWithUniqueNameUseCase: CreateSkillWithUniqueNameUseCase,
  ) {}

  async installAllPreCreatedForUser(userId: UUID): Promise<number> {
    const templates = await this.findActivePreCreatedTemplatesUseCase.execute(
      new FindActivePreCreatedTemplatesQuery(),
    );

    if (templates.length === 0) {
      this.logger.debug('No active pre-created skill templates found');
      return 0;
    }

    let successCount = 0;
    for (const template of templates) {
      try {
        const created = await this.createSkillWithUniqueNameUseCase.execute(
          new CreateSkillWithUniqueNameCommand({
            name: template.name,
            shortDescription: template.shortDescription,
            instructions: template.instructions,
            userId,
          }),
        );

        this.logger.debug(
          'Pre-created skill template installed and activated',
          { templateId: template.id, skillId: created.id, userId },
        );
        successCount++;
      } catch (error) {
        this.logger.error(
          'Failed to install individual pre-created skill template',
          {
            templateId: template.id,
            templateName: template.name,
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
      }
    }

    return successCount;
  }
}
