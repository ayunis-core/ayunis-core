import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import { FindShareByEntityUseCase } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.use-case';
import { FindShareByEntityQuery } from 'src/domain/shares/application/use-cases/find-share-by-entity/find-share-by-entity.query';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { Skill } from '../../../domain/skill.entity';

@Injectable()
export class ListSkillMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListSkillMcpIntegrationsUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly contextService: ContextService,
    private readonly findShareByEntityUseCase: FindShareByEntityUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log('Listing MCP integrations for skill', {
      skillId: query.skillId,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const skill = await this.findSkillOwnedOrShared(query.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(query.skillId);
    }

    if (skill.mcpIntegrationIds.length === 0) {
      return [];
    }

    return this.getMcpIntegrationsByIdsUseCase.execute(
      new GetMcpIntegrationsByIdsQuery(skill.mcpIntegrationIds),
    );
  }

  private async findSkillOwnedOrShared(
    skillId: UUID,
    userId: UUID,
  ): Promise<Skill | null> {
    const ownedSkill = await this.skillRepository.findOne(skillId, userId);
    if (ownedSkill) {
      return ownedSkill;
    }

    const share = await this.findShareByEntityUseCase.execute(
      new FindShareByEntityQuery(SharedEntityType.SKILL, skillId),
    );

    if (share) {
      const skills = await this.skillRepository.findByIds([skillId]);
      return skills.length > 0 ? skills[0] : null;
    }

    return null;
  }
}
