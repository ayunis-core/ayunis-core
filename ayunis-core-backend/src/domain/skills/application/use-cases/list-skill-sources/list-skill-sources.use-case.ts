import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UUID } from 'crypto';
import { ListSkillSourcesQuery } from './list-skill-sources.query';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Source } from 'src/domain/sources/domain/source.entity';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { Skill } from '../../../domain/skill.entity';

@Injectable()
export class ListSkillSourcesUseCase {
  constructor(
    @InjectPinoLogger(ListSkillSourcesUseCase.name)
    private readonly logger: PinoLogger,
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly contextService: ContextService,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
  ) {}

  async execute(query: ListSkillSourcesQuery): Promise<Source[]> {
    this.logger.info({ skillId: query.skillId }, 'Listing sources for skill');

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const skill = await this.findSkillOwnedOrShared(query.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(query.skillId);
      }

      if (skill.sourceIds.length === 0) {
        return [];
      }

      return this.getSourcesByIdsUseCase.execute(
        new GetSourcesByIdsQuery(skill.sourceIds),
      );
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Unexpected error listing skill sources',
      );
      throw new UnexpectedSkillError(error);
    }
  }

  private async findSkillOwnedOrShared(
    skillId: UUID,
    userId: UUID,
  ): Promise<Skill | null> {
    const ownedSkill = await this.skillRepository.findOne(skillId, userId);
    return ownedSkill ?? this.findSharedSkill(skillId);
  }

  private async findSharedSkill(skillId: UUID): Promise<Skill | null> {
    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.SKILL, skillId),
    );
    if (!share) {
      return null;
    }
    const skills = await this.skillRepository.findByIds([skillId]);
    return skills[0] ?? null;
  }
}
