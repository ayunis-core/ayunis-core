import { Injectable, Logger } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { CreateAgentCommand } from './create-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { FindOneToolUseCase } from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.use-case';
import {
  FindOneConfigurableToolQuery,
  FindOneToolQuery,
} from 'src/domain/tools/application/use-cases/find-one-tool/find-one-tool.query';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';

@Injectable()
export class CreateAgentUseCase {
  private readonly logger = new Logger(CreateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly findOneToolUseCase: FindOneToolUseCase,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
  ) {}

  async execute(command: CreateAgentCommand): Promise<Agent> {
    this.logger.log('Creating agent', { name: command.name });
    const model = await this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({
        id: command.modelId,
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
