import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AgentRepository } from '../../ports/agent.repository';
import { CreateAgentCommand } from './create-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { AgentToolAssignment } from 'src/domain/agents/domain/agent-tool-assignment.entity';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class CreateAgentUseCase {
  private readonly logger = new Logger(CreateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CreateAgentCommand): Promise<Agent> {
    this.logger.log('Creating agent', { name: command.name });
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const model = await this.getPermittedLanguageModelUseCase.execute(
      new GetPermittedLanguageModelQuery({
        id: command.modelId,
      }),
    );

    const tools = await Promise.all(
      command.toolAssignments.map((toolAssignment) => {
        if (toolAssignment.toolConfigId) {
          return this.assembleToolUseCase.execute(
            new AssembleToolCommand({
              type: toolAssignment.toolType,
              configId: toolAssignment.toolConfigId,
            }),
          );
        }
        return this.assembleToolUseCase.execute(
          new AssembleToolCommand({
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
      userId,
    });

    return this.agentRepository.create(agent);
  }
}
