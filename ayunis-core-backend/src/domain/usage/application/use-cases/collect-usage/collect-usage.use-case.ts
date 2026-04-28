import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CollectUsageCommand } from './collect-usage.command';
import { Usage } from '../../../domain/usage.entity';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
  UnexpectedUsageError,
} from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import {
  ContextService,
  ResolvedPrincipal,
} from '../../../../../common/context/services/context.service';
import { GetCreditsPerEuroUseCase } from '../../../../../iam/platform-config/application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { PlatformConfigNotFoundError } from '../../../../../iam/platform-config/application/platform-config.errors';

@Injectable()
export class CollectUsageUseCase {
  private readonly logger = new Logger(CollectUsageUseCase.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly contextService: ContextService,
    private readonly getCreditsPerEuroUseCase: GetCreditsPerEuroUseCase,
  ) {}

  async execute(command: CollectUsageCommand): Promise<void> {
    const principal = this.resolvePrincipal(command);
    const userId = principal.kind === 'user' ? principal.userId : null;
    const apiKeyId = principal.kind === 'apiKey' ? principal.apiKeyId : null;

    try {
      this.validateCommand(command);
      const usage = await this.buildUsage(command, principal);
      await this.usageRepository.save(usage);
      this.logger.log('Usage collected successfully', {
        principalKind: principal.kind,
        organizationId: principal.orgId,
        modelId: command.modelId,
        totalTokens: command.totalTokens,
        cost: usage.cost,
        requestId: command.requestId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to collect usage', {
        error: error as Error,
        command,
      });
      throw new UnexpectedUsageError(
        error instanceof Error ? error : new Error('Unknown error'),
        {
          userId: userId ?? undefined,
          apiKeyId: apiKeyId ?? undefined,
          organizationId: principal.orgId,
          modelId: command.modelId,
        },
      );
    }
  }

  private resolvePrincipal(command: CollectUsageCommand): ResolvedPrincipal {
    try {
      return this.contextService.requirePrincipal();
    } catch {
      throw new UsageCollectionFailedError(
        'No authenticated principal in context for usage collection',
        { modelId: command.modelId },
      );
    }
  }

  private async buildUsage(
    command: CollectUsageCommand,
    principal: ResolvedPrincipal,
  ): Promise<Usage> {
    const cost = this.calculateCost(command);
    const creditsConsumed = await this.calculateCredits(cost);
    return Usage.create({
      userId: principal.kind === 'user' ? principal.userId : null,
      apiKeyId: principal.kind === 'apiKey' ? principal.apiKeyId : null,
      organizationId: principal.orgId,
      modelId: command.modelId,
      provider: command.provider,
      inputTokens: command.inputTokens,
      outputTokens: command.outputTokens,
      totalTokens: command.totalTokens,
      cost,
      creditsConsumed,
      requestId: command.requestId ?? randomUUID(),
    });
  }

  private validateCommand(command: CollectUsageCommand): void {
    if (command.inputTokens < 0) {
      throw new InvalidUsageDataError('Input tokens cannot be negative', {
        inputTokens: command.inputTokens,
      });
    }
    if (command.outputTokens < 0) {
      throw new InvalidUsageDataError('Output tokens cannot be negative', {
        outputTokens: command.outputTokens,
      });
    }
    if (command.totalTokens < 0) {
      throw new InvalidUsageDataError('Total tokens cannot be negative', {
        totalTokens: command.totalTokens,
      });
    }
  }

  private async calculateCredits(
    cost: number | undefined,
  ): Promise<number | undefined> {
    if (cost === undefined) {
      return undefined;
    }

    try {
      const creditsPerEuro = await this.getCreditsPerEuroUseCase.execute();
      return cost * creditsPerEuro;
    } catch (error) {
      if (error instanceof PlatformConfigNotFoundError) {
        this.logger.warn('Could not calculate credits consumed', {
          error: error.message,
        });
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Calculates cost in EUR based on the model's per-million-token pricing.
   * Returns undefined if the model has no cost information configured.
   */
  private calculateCost(command: CollectUsageCommand): number | undefined {
    const model = command.model;

    const inputTokenCost = model.inputTokenCost;
    const outputTokenCost = model.outputTokenCost;

    if (inputTokenCost === undefined || outputTokenCost === undefined) {
      this.logger.debug('No cost information available for model', {
        modelId: model.id,
        hasInputCost: inputTokenCost !== undefined,
        hasOutputCost: outputTokenCost !== undefined,
      });

      return undefined;
    }

    const inputCost = (command.inputTokens / 1_000_000) * inputTokenCost;
    const outputCost = (command.outputTokens / 1_000_000) * outputTokenCost;
    const totalCost = inputCost + outputCost;

    this.logger.debug('Cost calculated for usage (EUR)', {
      modelId: model.id,
      inputTokens: command.inputTokens,
      outputTokens: command.outputTokens,
      inputTokenCost: model.inputTokenCost,
      outputTokenCost: model.outputTokenCost,
      inputCost,
      outputCost,
      totalCost,
    });

    return totalCost;
  }
}
