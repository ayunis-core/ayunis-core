import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillWithUniqueNameCommand } from './create-skill-with-unique-name.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillNameResolutionError } from '../../skills.errors';
import type { UUID } from 'crypto';

const MAX_NAME_RESOLUTION_ATTEMPTS = 100;

@Injectable()
export class CreateSkillWithUniqueNameUseCase {
  constructor(
    @InjectPinoLogger(CreateSkillWithUniqueNameUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
  ) {}

  async execute(command: CreateSkillWithUniqueNameCommand): Promise<Skill> {
    this.logger.info(
      {
        name: command.name,
        userId: command.userId,
      },
      'Creating skill with unique name resolution',
    );

    const name = await this.resolveUniqueName(command.name, command.userId);

    const skill = new Skill({
      name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      marketplaceIdentifier: command.marketplaceIdentifier,
      userId: command.userId,
    });

    const created = await this.skillRepository.create(skill);

    const shouldActivate = command.isActive || command.isPinned;

    if (shouldActivate) {
      await this.skillRepository.activateSkill(created.id, command.userId);
    }

    if (command.isPinned) {
      await this.skillRepository.pinSkill(created.id, command.userId);
    }

    this.logger.debug(
      {
        skillId: created.id,
        name: created.name,
        userId: command.userId,
        isActive: command.isActive,
        isPinned: command.isPinned,
      },
      'Skill created',
    );

    return created;
  }

  private async resolveUniqueName(
    baseName: string,
    userId: UUID,
  ): Promise<string> {
    let name = baseName;
    let suffix = 2;
    while (await this.skillRepository.findByNameAndOwner(name, userId)) {
      if (suffix > MAX_NAME_RESOLUTION_ATTEMPTS) {
        throw new SkillNameResolutionError(
          baseName,
          MAX_NAME_RESOLUTION_ATTEMPTS,
        );
      }
      name = `${baseName} ${suffix}`;
      suffix++;
    }
    return name;
  }
}
