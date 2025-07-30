import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { CreateAgentCommand } from './create-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { FindOneToolUseCase } from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.use-case';
import {
  FindOneConfigurableToolQuery,
  FindOneToolQuery,
} from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.query';
import { GetPermittedModelQuery } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.query';
import { GetPermittedModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-model/get-permitted-model.use-case';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';

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
      new GetPermittedModelQuery({
        permittedModelId: command.modelId,
        orgId: command.orgId,
      }),
    );

    const tools = await Promise.all(
      command.toolAssignments.map((toolAssignment) => {
        if (toolAssignment.toolConfigId) {
          return this.findOneToolUseCase.execute(
            new FindOneConfigurableToolQuery({
              type: toolAssignment.toolType,
              configId: toolAssignment.toolConfigId,
              userId: command.userId,
            }),
          );
        }
        return this.findOneToolUseCase.execute(
          new FindOneToolQuery({
            type: toolAssignment.toolType,
          }),
        );
      }),
    );

    const toolAssignments = tools.map(
      (tool) =>
        new AgentToolAssignment({
          tool,
        }),
    );

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
