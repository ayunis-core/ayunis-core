import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { CreateAgentCommand } from './create-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { FindOneToolUseCase } from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.use-case';
import { AgentToolAssignment } from '../../../domain/value-objects/agent-tool-assignment.object';
import { FindOneConfigurableToolQuery } from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.query';
import {
  GetPermittedModelByIdQuery,
  GetPermittedModelQuery,
} from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';

@Injectable()
export class CreateAgentUseCase {
  private readonly logger = new Logger(CreateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly findOneToolUseCase: FindOneToolUseCase,
    private readonly getPermittedModelUseCase: GetPermittedModelUseCase,
  ) {}

  async execute(command: CreateAgentCommand): Promise<Agent> {
    this.logger.log('Creating agent', { name: command.name });
    const model = await this.getPermittedModelUseCase.execute(
      new GetPermittedModelByIdQuery({
        modelId: command.modelId,
        orgId: command.orgId,
      }),
    );

    // Validate tools exist if there are any tool assignments
    for (const toolAssignment of command.toolAssignments) {
      if (toolAssignment.toolConfigId) {
        // Validate that the tool exists and belongs to the user
        await this.findOneToolUseCase.execute(
          new FindOneConfigurableToolQuery({
            type: toolAssignment.toolType,
            configId: toolAssignment.toolConfigId,
            userId: command.userId,
          }),
        );
      }
    }

    const toolAssignments = command.toolAssignments.map((toolAssignment) => {
      return new AgentToolAssignment({
        toolType: toolAssignment.toolType,
        toolConfigId: toolAssignment.toolConfigId,
      });
    });

    // Create agent
    const agent = new Agent({
      name: command.name,
      instructions: command.instructions,
      model,
      toolAssignments,
      userId: command.userId,
    });

    return this.agentRepository.create(agent);
  }
}
