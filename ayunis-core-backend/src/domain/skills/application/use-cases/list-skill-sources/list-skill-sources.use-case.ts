import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Skill } from 'src/domain/skills/domain/skill';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { ListSkillSourcesQuery } from './list-skill-sources.query';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Source } from 'src/domain/sources/domain/source.entity';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';

@Injectable()
export class ListSkillSourcesUseCase {
  private readonly logger = new Logger(ListSkillSourcesUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly getSourcesByIdsUseCase: GetSourcesByIdsUseCase,
    private readonly contextService: ContextService,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: ListSkillSourcesQuery): Promise<Source[]> {
    this.logger.log({ skillId: query.skillId }, 'Listing sources for skill');

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const skill = await this.findSkillOwnedOrShared(query.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(query.skillId);
    }
    return this.executeForAuthorizedSkill(skill);
  }

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async executeForAuthorizedSkill(skill: Skill): Promise<Source[]> {
    if (skill.sourceIds.length === 0) return [];
    return this.getSourcesByIdsUseCase.execute(
      new GetSourcesByIdsQuery(skill.sourceIds),
    );
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
