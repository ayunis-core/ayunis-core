import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import { GetMcpIntegrationsByIdsQuery } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.query';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { UnexpectedSkillError } from 'src/domain/skills/application/skills.errors';
import { findSkillWithMcpIntegrations } from 'src/domain/skills/application/util/find-skill-with-mcp-integrations';
import { ListSkillMcpIntegrationsQuery } from './list-skill-mcp-integrations.query';

@Injectable()
export class ListSkillMcpIntegrationsUseCase {
  private readonly logger = new Logger(ListSkillMcpIntegrationsUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly getMcpIntegrationsByIdsUseCase: GetMcpIntegrationsByIdsUseCase,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    query: ListSkillMcpIntegrationsQuery,
  ): Promise<McpIntegration[]> {
    this.logger.log(
      { skillId: query.skillId },
      'Listing MCP integrations for skill',
    );
    const skill = await findSkillWithMcpIntegrations(
      this.skillRepository,
      query.skillId,
    );
    await this.authorization.requireRead(skill);
    if (skill.mcpIntegrationIds.length === 0) return [];
    return this.getMcpIntegrationsByIdsUseCase.execute(
      new GetMcpIntegrationsByIdsQuery(skill.mcpIntegrationIds),
    );
  }
}
