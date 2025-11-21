import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RemoveSourceFromAgentCommand } from './remove-source-from-agent.command';
import { AgentRepository } from '../../ports/agent.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { AgentNotFoundError, UnexpectedAgentError } from '../../agents.errors';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { GetTextSourceByIdUseCase } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.use-case';
import { GetTextSourceByIdQuery } from 'src/domain/sources/application/use-cases/get-text-source-by-id/get-text-source-by-id.query';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class RemoveSourceFromAgentUseCase {
  private readonly logger = new Logger(RemoveSourceFromAgentUseCase.name);

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly contextService: ContextService,
    private readonly getSourceByIdUseCase: GetTextSourceByIdUseCase,
    private readonly deleteSourceUseCase: DeleteSourceUseCase,
  ) {}

  @Transactional()
  async execute(command: RemoveSourceFromAgentCommand): Promise<void> {
    this.logger.log('removeSource', {
      agentId: command.agentId,
      sourceAssignmentId: command.sourceAssignmentId,
    });
    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      const agent = await this.agentRepository.findOne(command.agentId, userId);
      if (!agent) {
        throw new AgentNotFoundError(command.agentId);
      }

      const sourceAssignment = agent.sourceAssignments.find(
        (assignment) => assignment.id === command.sourceAssignmentId,
      );
      if (!sourceAssignment) {
        return;
      }
      const updatedSourceAssignments = agent.sourceAssignments.filter(
        (assignment) => assignment.id !== command.sourceAssignmentId,
      );

      const updatedAgent = new Agent({
        ...agent,
        sourceAssignments: updatedSourceAssignments,
      });

      const source = await this.getSourceByIdUseCase.execute(
        new GetTextSourceByIdQuery(sourceAssignment.source.id),
      );

      await this.deleteSourceUseCase.execute(new DeleteSourceCommand(source));

      await this.agentRepository.update(updatedAgent);
    } catch (error) {
      if (
        error instanceof ApplicationError ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Error removing source from agent', {
        error: error as Error,
      });
      throw new UnexpectedAgentError(error);
    }
  }
}
