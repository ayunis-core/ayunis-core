import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { UpdateAgentCommand } from './update-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { GetPermittedModelQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';

@Injectable()
export class UpdateAgentUseCase {
  private readonly logger = new Logger(UpdateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
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

    // Create updated agent
    const updatedAgent = new Agent({
      id: existingAgent.id,
      name: command.name,
      instructions: command.instructions,
      model,
      tools: existingAgent.tools, // Keep existing tools for now
      userId: command.userId,
      createdAt: existingAgent.createdAt,
      updatedAt: new Date(),
    });

    return this.agentRepository.create(updatedAgent);
  }
}
