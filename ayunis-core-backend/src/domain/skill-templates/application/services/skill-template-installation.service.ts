import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { CreateSkillWithUniqueNameUseCase } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.use-case';
import { CreateSkillWithUniqueNameCommand } from 'src/domain/skills/application/use-cases/create-skill-with-unique-name/create-skill-with-unique-name.command';
import { FindActivePreCreatedTemplatesUseCase } from '../use-cases/find-active-pre-created-templates/find-active-pre-created-templates.use-case';
import { FindActivePreCreatedTemplatesQuery } from '../use-cases/find-active-pre-created-templates/find-active-pre-created-templates.query';

@Injectable()
export class SkillTemplateInstallationService {
  constructor(
    @InjectPinoLogger(SkillTemplateInstallationService.name)
    private readonly logger: PinoLogger,
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
            isActive: template.defaultActive,
            isPinned: template.defaultPinned,
          }),
        );

        this.logger.debug(
          {
            templateId: template.id,
            skillId: created.id,
            userId,
            isActive: template.defaultActive,
            isPinned: template.defaultPinned,
          },
          'Pre-created skill template installed',
        );
        successCount++;
      } catch (error) {
        this.logger.error(
          {
            templateId: template.id,
            name: template.name,
            userId,
            err: error as Error,
          },
          'Failed to install individual pre-created skill template',
        );
      }
    }

    return successCount;
  }
}
