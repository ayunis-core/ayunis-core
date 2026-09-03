import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnassignMcpIntegrationFromSkillCommand } from './unassign-mcp-integration-from-skill.command';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import {
  SkillNotFoundError,
  SkillMcpIntegrationNotAssignedError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UnassignMcpIntegrationFromSkillUseCase {
  private readonly logger = new Logger(
    UnassignMcpIntegrationFromSkillUseCase.name,
  );

  constructor(
    @Inject(SkillRepository)
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
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

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const skill = await this.skillRepository.findOne(command.skillId, userId);
      if (!skill) {
        throw new SkillNotFoundError(command.skillId);
      }

      if (!skill.mcpIntegrationIds.includes(command.integrationId)) {
        throw new SkillMcpIntegrationNotAssignedError(command.integrationId);
      }

      const updatedSkill = new Skill({
        ...skill,
        mcpIntegrationIds: skill.mcpIntegrationIds.filter(
          (id) => id !== command.integrationId,
        ),
      });

      return await this.skillRepository.update(updatedSkill);
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
        'Unexpected error unassigning MCP integration',
      );
      throw new UnexpectedSkillError(error);
    }
  }
}
