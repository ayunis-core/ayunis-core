import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AgentRepository } from '../../ports/agent.repository';
import { UpdateAgentCommand } from './update-agent.command';
import { Agent } from '../../../domain/agent.entity';
import { AgentNotFoundError } from '../../agents.errors';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { GetPermittedLanguageModelQuery } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.query';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UpdateAgentUseCase {
  private readonly logger = new Logger(UpdateAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getPermittedLanguageModelUseCase: GetPermittedLanguageModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
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

    // Create updated agent
    const updatedAgent = new Agent({
      id: existingAgent.id,
      name: command.name,
      instructions: command.instructions,
      model,
      userId,
      // Preserve existing relationships
      toolAssignments: existingAgent.toolAssignments,
      sourceAssignments: existingAgent.sourceAssignments,
      mcpIntegrationIds: existingAgent.mcpIntegrationIds,
      marketplaceIdentifier: existingAgent.marketplaceIdentifier,
      createdAt: existingAgent.createdAt,
      updatedAt: new Date(),
    });

    return this.agentRepository.update(updatedAgent);
  }
}
