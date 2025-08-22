import { Injectable, Logger } from '@nestjs/common';
import { ReplaceModelWithUserDefaultCommand } from './replace-model-with-user-default.command';
import { AgentRepository } from '../../ports/agent.repository';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';

@Injectable()
export class ReplaceModelWithUserDefaultUseCase {
  private readonly logger = new Logger(ReplaceModelWithUserDefaultUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async execute(command: ReplaceModelWithUserDefaultCommand): Promise<void> {
    this.logger.log('Starting agent model replacement', {
      oldPermittedModelId: command.oldPermittedModelId,
    });

    const agents = await this.agentRepository.findAllByModel(
      command.oldPermittedModelId,
    );

    this.logger.debug('Found agents using model', {
      count: agents.length,
      modelId: command.oldPermittedModelId,
      agentIds: agents.map((a) => a.id),
    });

    if (agents.length === 0) {
      this.logger.log('No agents found using model, nothing to replace');
      return;
    }

    // TODO: Make this a single transaction
    for (const agent of agents) {
      this.logger.debug('Processing agent for model replacement', {
        agentId: agent.id,
        agentName: agent.name,
        userId: agent.userId,
        currentModelId: agent.model.id,
        orgId: agent.model.orgId,
      });

      try {
        const defaultModel = await this.getDefaultModelUseCase.execute(
          new GetDefaultModelQuery({
            orgId: agent.model.orgId,
            userId: agent.userId,
          }),
        );

        this.logger.debug('Found default model for user', {
          agentId: agent.id,
          agentName: agent.name,
          userId: agent.userId,
          defaultModelId: defaultModel.id,
          defaultModelName: defaultModel.model.name,
        });

        await this.agentRepository.updateModel(
          agent.id,
          agent.userId,
          defaultModel,
        );

        this.logger.debug('Successfully updated agent model', {
          agentId: agent.id,
          agentName: agent.name,
          userId: agent.userId,
          oldModelId: command.oldPermittedModelId,
          newModelId: defaultModel.id,
        });
      } catch (error) {
        this.logger.error('Failed to update agent model', {
          agentId: agent.id,
          agentName: agent.name,
          userId: agent.userId,
          oldModelId: command.oldPermittedModelId,
          error: (error as Error).message,
          stack: (error as Error).stack,
        });
        throw error;
      }
    }

    this.logger.log('Completed agent model replacement', {
      agentsProcessed: agents.length,
      oldModelId: command.oldPermittedModelId,
    });

    // Final verification: check if any agents still reference the old model
    const remainingAgents = await this.agentRepository.findAllByModel(
      command.oldPermittedModelId,
    );

    if (remainingAgents.length > 0) {
      this.logger.error(
        'CRITICAL: Agents still reference old model after replacement!',
        {
          remainingCount: remainingAgents.length,
          oldModelId: command.oldPermittedModelId,
          remainingAgentIds: remainingAgents.map((a) => a.id),
        },
      );
      throw new Error(
        `Failed to replace model in ${remainingAgents.length} agents`,
      );
    } else {
      this.logger.log('Verification successful: No agents reference old model');
    }
  }
}
