import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { UpdateAgentCommand } from './update-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateAgentUseCase {
  private readonly logger = new Logger(UpdateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateAgentCommand): Promise<Agent> {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    this.logger.log('Updating agent', {
      agentId: command.agentId,
      name: command.name,
      userId,
    });

    // Check if agent exists and belongs to user
    const existingAgent = await this.agentRepository.findOne(
      command.agentId,
      userId,
    );

    if (!existingAgent) {
      throw new AgentNotFoundError(command.agentId);
    }

    // Get the permitted model
    const model = await this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({
        id: command.modelId,
      }),
    );

    // create enabled tool assignments
    const toolAssignments = await Promise.all(
      command.toolAssignments
        .filter((t) => t.isEnabled)
        .map(async (toolAssignment) => {
          if (toolAssignment.toolConfigId) {
            const tool = await this.assembleToolUseCase.execute(
              new AssembleToolCommand({
                type: toolAssignment.toolType,
                configId: toolAssignment.toolConfigId,
              }),
            );
            return new AgentToolAssignment({
              id: toolAssignment.id,
              tool,
            });
          }
          const tool = await this.assembleToolUseCase.execute(
            new AssembleToolCommand({
              type: toolAssignment.toolType,
            }),
          );
          return new AgentToolAssignment({
            id: toolAssignment.id,
            tool,
          });
        }),
    );

    // Create updated agent
    const updatedAgent = new Agent({
      id: existingAgent.id,
      name: command.name,
      instructions: command.instructions,
      model,
      toolAssignments,
      userId,
      createdAt: existingAgent.createdAt,
      updatedAt: new Date(),
    });

    return this.agentRepository.update(updatedAgent);
  }
}
