import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { ShareAuthorizationStrategy } from 'src/domain/shares/application/ports/share-authorization-strategy.port';
import { SkillRepository } from '../ports/skill.repository';

/**
 * Skill-specific implementation of share authorization.
 * Validates that users can only manage shares for skills they own.
 */
@Injectable()
export class SkillShareAuthorizationStrategy implements ShareAuthorizationStrategy {
  constructor(
    @InjectPinoLogger(SkillShareAuthorizationStrategy.name)
    private readonly logger: PinoLogger,
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
  ) {}

  /**
   * Check if a user can view shares for a skill.
   * User must own the skill to view its shares.
   */
  async canViewShares(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ skillId, userId }, 'canViewShares');

    const skill = await this.skillRepository.findOne(skillId, userId);
    return skill !== null;
  }

  /**
   * Check if a user can create a share for a skill.
   * User must own the skill to create shares for it.
   */
  async canCreateShare(skillId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ skillId, userId }, 'canCreateShare');

    const skill = await this.skillRepository.findOne(skillId, userId);
    return skill !== null;
  }

  /**
   * Check if a user can delete a share.
   * For skill shares, this is handled at the share level by checking ownerId.
   */
  canDeleteShare(shareId: UUID, userId: UUID): Promise<boolean> {
    this.logger.info({ shareId, userId }, 'canDeleteShare');

    return Promise.resolve(true);
  }
}
