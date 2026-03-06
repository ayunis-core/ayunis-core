import { Inject, Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { CreateSkillWithUniqueNameCommand } from './create-skill-with-unique-name.command';
import { Skill, InvalidSkillNameError } from '../../../domain/skill.entity';
import {
  SkillNameResolutionError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import type { UUID } from 'crypto';

const MAX_NAME_LENGTH = 100;
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

    try {
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
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof InvalidSkillNameError
      )
        throw error;
      this.logger.error('Error creating skill with unique name', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }

  private async resolveUniqueName(
    baseName: string,
    userId: UUID,
  ): Promise<string> {
    const baseCodePoints = [...baseName];
    let truncatedBase = '';
    for (const cp of baseCodePoints) {
      if (truncatedBase.length + cp.length > MAX_NAME_LENGTH) break;
      truncatedBase += cp;
    }
    truncatedBase = truncatedBase.trimEnd();

    let name = truncatedBase;
    let suffix = 2;
    while (await this.skillRepository.findByNameAndOwner(name, userId)) {
      if (suffix > MAX_NAME_RESOLUTION_ATTEMPTS) {
        throw new SkillNameResolutionError(
          baseName,
          MAX_NAME_RESOLUTION_ATTEMPTS,
        );
      }
      const suffixStr = ` ${suffix}`;
      const codePoints = [...truncatedBase];
      let truncated = '';
      for (const cp of codePoints) {
        if (truncated.length + cp.length + suffixStr.length > MAX_NAME_LENGTH)
          break;
        truncated += cp;
      }
      truncated = truncated.trimEnd();
      name = `${truncated}${suffixStr}`;
      suffix++;
    }
    return name;
  }
}
