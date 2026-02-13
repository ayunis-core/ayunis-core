import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { SkillNotFoundError, UnexpectedSkillError } from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
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

  async execute(
    query: ListSkillMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log('Listing MCP integrations for skill', {
      skillId: query.skillId,
    });

    try {
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
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Unexpected error listing skill MCP integrations', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
