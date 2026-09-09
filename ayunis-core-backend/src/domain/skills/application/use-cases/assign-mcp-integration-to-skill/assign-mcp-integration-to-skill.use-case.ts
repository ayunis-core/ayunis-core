import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AssignMcpIntegrationToSkillCommand } from './assign-mcp-integration-to-skill.command';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';

import {
  SkillNotFoundError,
  SkillMcpIntegrationNotFoundError,
  SkillMcpIntegrationAlreadyAssignedError,
  SkillMcpIntegrationDisabledError,
  SkillMcpIntegrationWrongOrganizationError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

@Injectable()
export class AssignMcpIntegrationToSkillUseCase {
  private readonly logger = new Logger(AssignMcpIntegrationToSkillUseCase.name);

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    @Inject(McpIntegrationsRepositoryPort)
    private readonly mcpIntegrationsRepository: McpIntegrationsRepositoryPort,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: AssignMcpIntegrationToSkillCommand,
  ): Promise<PersonalSkill> {
    this.logger.log(
      {
        skillId: command.skillId,
        integrationId: command.integrationId,
      },
      'Assigning MCP integration to skill',
    );

    const userId = this.contextService.get('userId');
    const orgId = this.contextService.get('orgId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const skill = await this.skillRepository.findOne(command.skillId, userId);
    if (!skill) {
      throw new SkillNotFoundError(command.skillId);
    }

    await this.assertIntegrationCanBeAssigned(command.integrationId, orgId);

    if (skill.mcpIntegrationIds.includes(command.integrationId)) {
      throw new SkillMcpIntegrationAlreadyAssignedError(command.integrationId);
    }

    const updatedSkill = skill.withUpdates({
      ...skill,
      mcpIntegrationIds: [...skill.mcpIntegrationIds, command.integrationId],
    });

    return await this.skillRepository.update(updatedSkill, skill);
  }

  private async assertIntegrationCanBeAssigned(
    integrationId: UUID,
    orgId: UUID | undefined,
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
