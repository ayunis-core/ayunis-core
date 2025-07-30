import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { UpdateAgentCommand } from './update-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { GetPermittedModelQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';
import {
  FindOneConfigurableToolQuery,
  FindOneToolQuery,
} from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.query';
import { FindOneToolUseCase } from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.use-case';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';

@Injectable()
export class UpdateAgentUseCase {
  private readonly logger = new Logger(UpdateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
    private readonly findOneToolUseCase: FindOneToolUseCase,
  ) {}

  async execute(command: UpdateAgentCommand): Promise<Agent> {
    this.logger.log('Updating agent', {
      agentId: command.agentId,
      name: command.name,
      userId: command.userId,
    });

    // Check if agent exists and belongs to user
    const existingAgent = await this.agentRepository.findOne(
      command.agentId,
      command.userId,
    );

    if (!existingAgent) {
      throw new AgentNotFoundError(command.agentId);
    }

    // Get the permitted model
    const model = await this.getPermittedModelUseCase.execute(
      new GetPermittedModelQuery({
        permittedModelId: command.modelId,
        orgId: command.orgId,
      }),
    );

    // create enabled tool assignments
    const toolAssignments = await Promise.all(
      command.toolAssignments
        .filter((t) => t.isEnabled)
        .map(async (toolAssignment) => {
          if (toolAssignment.toolConfigId) {
            const tool = await this.findOneToolUseCase.execute(
              new FindOneConfigurableToolQuery({
                type: toolAssignment.toolType,
                configId: toolAssignment.toolConfigId,
                userId: command.userId,
              }),
            );
            return new AgentToolAssignment({
              id: toolAssignment.id,
              tool,
            });
          }
          const tool = await this.findOneToolUseCase.execute(
            new FindOneToolQuery({
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
      userId: command.userId,
      createdAt: existingAgent.createdAt,
      updatedAt: new Date(),
    });

    return this.agentRepository.update(updatedAgent);
  }
}
