import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Skill } from 'src/domain/skills/domain/skill';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { findSkillWithMcpIntegrations } from 'src/domain/skills/application/util/find-skill-with-mcp-integrations';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AssignMcpIntegrationToSkillCommand } from './assign-mcp-integration-to-skill.command';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';

import {
  SkillMcpIntegrationNotFoundError,
  SkillMcpIntegrationAlreadyAssignedError,
  SkillMcpIntegrationDisabledError,
  SkillMcpIntegrationWrongOrganizationError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { UUID } from 'crypto';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class AssignMcpIntegrationToSkillUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToSkillUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: AssignMcpIntegrationToSkillCommand): Promise<Skill> {
    this.logger.log(
      {
        skillId: command.skillId,
        integrationId: command.integrationId,
      },
      'Assigning MCP integration to skill',
    );

    const { orgId } = getRequiredUserContext(this.contextService);

    const skill = await findSkillWithMcpIntegrations(
      this.skillRepository,
      command.skillId,
    );
    await this.authorization.requireWrite(skill);

    await this.assertIntegrationCanBeAssigned(command.integrationId, orgId);

    if (skill.mcpIntegrationIds.includes(command.integrationId)) {
      throw new SkillMcpIntegrationAlreadyAssignedError(command.integrationId);
    }

    const updatedSkill = skill.withUpdates({
      mcpIntegrationIds: [...skill.mcpIntegrationIds, command.integrationId],
    });

    return await this.skillRepository.update(updatedSkill, skill);
  }

  private async assertIntegrationCanBeAssigned(
    integrationId: UUID,
    orgId: UUID,
  ): Promise<void> {
    const integration =
      await this.mcpIntegrationsRepository.findById(integrationId);
    if (!integration) {
      throw new SkillMcpIntegrationNotFoundError(integrationId);
    }
    if (!integration.enabled) {
      throw new SkillMcpIntegrationDisabledError(integrationId);
    }
    if (integration.orgId !== orgId) {
      throw new SkillMcpIntegrationWrongOrganizationError(integrationId);
    }
  }
}
