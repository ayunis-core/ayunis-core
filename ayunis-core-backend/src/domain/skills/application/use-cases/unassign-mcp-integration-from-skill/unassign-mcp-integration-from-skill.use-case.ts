import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillMcpIntegrationNotAssignedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { findSkillWithMcpIntegrations } from 'src/domain/skills/application/util/find-skill-with-mcp-integrations';
import type { Skill } from 'src/domain/skills/domain/skill';
import { UnassignMcpIntegrationFromSkillCommand } from './unassign-mcp-integration-from-skill.command';

@Injectable()
export class UnassignMcpIntegrationFromSkillUseCase {
  private readonly logger = new Logger(
    UnassignMcpIntegrationFromSkillUseCase.name,
  );

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: UnassignMcpIntegrationFromSkillCommand,
  ): Promise<Skill> {
    this.logger.log(
      {
        skillId: command.skillId,
        integrationId: command.integrationId,
      },
      'Unassigning MCP integration from skill',
    );

    const skill = await findSkillWithMcpIntegrations(
      this.skillRepository,
      command.skillId,
    );
    await this.authorization.requireWrite(skill);

    if (!skill.mcpIntegrationIds.includes(command.integrationId)) {
      throw new SkillMcpIntegrationNotAssignedError(command.integrationId);
    }

    const updatedSkill = skill.withUpdates({
      mcpIntegrationIds: skill.mcpIntegrationIds.filter(
        (id) => id !== command.integrationId,
      ),
    });

    return await this.skillRepository.update(updatedSkill, skill);
  }
}
