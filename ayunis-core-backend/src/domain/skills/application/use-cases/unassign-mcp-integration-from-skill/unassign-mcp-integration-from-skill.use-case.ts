import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from '../../ports/skill.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { UnassignMcpIntegrationFromSkillCommand } from './unassign-mcp-integration-from-skill.command';
import { Skill } from '../../../domain/skill.entity';
import {
  SkillNotFoundError,
  SkillMcpIntegrationNotAssignedError,
  UnexpectedSkillError,
} from '../../skills.errors';

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
  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(
    command: UnassignMcpIntegrationFromSkillCommand,
  ): Promise<Skill> {
    this.logger.log('Unassigning MCP integration from skill', {
      skillId: command.skillId,
      integrationId: command.integrationId,
    });

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

    return this.skillRepository.update(updatedSkill);
  }
}
