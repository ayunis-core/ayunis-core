import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillWithUniqueNameCommand } from './create-skill-with-unique-name.command';
import { Skill } from '../../../domain/skill.entity';
import { SkillNameResolutionError } from '../../skills.errors';
import type { UUID } from 'crypto';

const MAX_NAME_RESOLUTION_ATTEMPTS = 100;

@Injectable()
export class CreateSkillWithUniqueNameUseCase {
  private readonly logger = new Logger(CreateSkillWithUniqueNameUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
  ) {}

  async execute(command: CreateSkillWithUniqueNameCommand): Promise<Skill> {
    this.logger.log('Creating skill with unique name resolution', {
      baseName: command.name,
      userId: command.userId,
    });

    const name = await this.resolveUniqueName(command.name, command.userId);

    const skill = new Skill({
      name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      marketplaceIdentifier: command.marketplaceIdentifier,
      userId: command.userId,
    });

    const created = await this.skillRepository.create(skill);
    await this.skillRepository.activateSkill(created.id, command.userId);

    this.logger.debug('Skill created and activated', {
      skillId: created.id,
      name: created.name,
      userId: command.userId,
    });

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
