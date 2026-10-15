import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';

@Injectable()
export class ListSkillMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListSkillMcpIntegrationsUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log(
      {
        skillId: query.skillId,
      },
      'Listing MCP integrations for skill',
    );

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const skill = await this.skillRepository.findOne(query.skillId, userId);
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
}
