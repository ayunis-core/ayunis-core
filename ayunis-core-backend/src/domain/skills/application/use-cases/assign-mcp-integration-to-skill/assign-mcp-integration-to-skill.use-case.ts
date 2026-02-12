import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AssignMcpIntegrationToSkillCommand } from './assign-mcp-integration-to-skill.command';
import { SkillRepository } from '../../ports/skill.repository';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { ContextService } from 'src/common/context/services/context.service';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillNotFoundError,
  SkillMcpIntegrationNotFoundError,
  SkillMcpIntegrationAlreadyAssignedError,
  SkillMcpIntegrationDisabledError,
  SkillMcpIntegrationWrongOrganizationError,
  UnexpectedSkillError,
} from '../../skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

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
  async execute(command: AssignMcpIntegrationToSkillCommand): Promise<Skill> {
    this.logger.log('Assigning MCP integration to skill', {
      skillId: command.skillId,
      integrationId: command.integrationId,
    });

    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      const integration = await this.mcpIntegrationsRepository.findById(
        command.integrationId,
      );
      if (!integration) {
        throw new SkillMcpIntegrationNotFoundError(command.integrationId);
      }

      if (!integration.enabled) {
        throw new SkillMcpIntegrationDisabledError(command.integrationId);
      }

      if (integration.orgId !== orgId) {
        throw new SkillMcpIntegrationWrongOrganizationError(
          command.integrationId,
        );
      }

      if (skill.mcpIntegrationIds.includes(command.integrationId)) {
        throw new SkillMcpIntegrationAlreadyAssignedError(
          command.integrationId,
        );
      }

      const updatedSkill = new Skill({
        ...skill,
        mcpIntegrationIds: [...skill.mcpIntegrationIds, command.integrationId],
      });

      return await this.skillRepository.update(updatedSkill);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Unexpected error assigning MCP integration', {
        error: error as Error,
      });
      throw new UnexpectedSkillError(error);
    }
  }
}
