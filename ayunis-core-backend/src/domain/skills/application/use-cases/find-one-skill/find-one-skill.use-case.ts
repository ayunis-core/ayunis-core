import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from '../../ports/skill.repository';
import { FindOneSkillQuery } from './find-one-skill.query';
import { Skill } from '../../../domain/skill.entity';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

export interface SkillWithShareStatus {
  skill: Skill;
  isShared: boolean;
}

@Injectable()
export class FindOneSkillUseCase {
  private readonly logger = new Logger(FindOneSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: FindOneSkillQuery): Promise<SkillWithShareStatus> {
    this.logger.log('Finding skill', { id: query.id });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Try owned skill first
      const ownedSkill = await this.skillRepository.findOne(query.id, userId);
      if (ownedSkill) {
        return { skill: ownedSkill, isShared: false };
      }

      // Check if skill is shared with user
      const share = await this.findShareByEntityUseCase.execute(
        new FindShareByEntityQuery(SharedEntityType.SKILL, query.id),
      );

      if (share) {
        const sharedSkills = await this.skillRepository.findByIds([query.id]);
        if (sharedSkills.length > 0) {
          return { skill: sharedSkills[0], isShared: true };
        }
      }

      throw new SkillNotFoundError(query.id);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error finding skill', { error: error as Error });
      throw new UnexpectedSkillError(error);
    }
  }
}
