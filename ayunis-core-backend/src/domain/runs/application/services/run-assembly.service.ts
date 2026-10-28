import type { UUID } from 'crypto';
import { run, RunContext, type Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { UnmaskedTermsService } from 'src/domain/runs/application/services/unmasked-terms.service';
import { ResolveModelProviderQuery } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.query';
import { ResolveModelProviderUseCase } from 'src/domain/models/application/use-cases/resolve-model-provider/resolve-model-provider.use-case';
import { ContextBudgetHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/context-budget-hook.factory';
import { CreditGateHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/credit-gate-hook.factory';
import { ModelCallObservabilityHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/model-call-observability-hook.factory';
import { PersistenceHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/persistence-hook.factory';
import { SkillActivationHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/skill-activation-hook.factory';
import { ToolUsageHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/tool-usage-hook.factory';
import { UsageHookFactory } from 'src/domain/runs/application/agent-runtime/hooks/usage-hook.factory';
import { RuntimeHistoryMaterializer } from 'src/domain/runs/application/agent-runtime/runtime-history-materializer';
import { RuntimeModelRegistry } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import { RUN_RETRY_CONFIG } from 'src/domain/runs/application/agent-runtime/run-retry.config';
import type { PreparedRun } from './run-assembly.types';

const MAX_ITERATIONS = 50;

export interface AssembledRun {
  events: ReturnType<typeof run>;
  models: RuntimeModelRegistry;
}

@Injectable()
export class RunAssemblyService {
  constructor(
    private readonly unmaskedTermsService: UnmaskedTermsService,
    private readonly resolveModelProviderUseCase: ResolveModelProviderUseCase,
    private readonly runtimeHistoryMaterializer: RuntimeHistoryMaterializer,
    private readonly creditGateHookFactory: CreditGateHookFactory,
    private readonly usageHookFactory: UsageHookFactory,
    private readonly modelCallObservabilityHookFactory: ModelCallObservabilityHookFactory,
    private readonly persistenceHookFactory: PersistenceHookFactory,
    private readonly toolUsageHookFactory: ToolUsageHookFactory,
    private readonly skillActivationHookFactory: SkillActivationHookFactory,
    private readonly contextBudgetHookFactory: ContextBudgetHookFactory,
  ) {}

  async assemble(
    prepared: PreparedRun,
    onMessagePersisted: (messageId: UUID) => void,
    signal?: AbortSignal,
  ): Promise<AssembledRun> {
    const historyMessages = await this.unmaskedTermsService.revealUnmaskedTerms(
      prepared.thread.messages,
      prepared.thread.id,
      prepared.isAnonymous,
    );
    const provider = await this.resolveModelProviderUseCase.execute(
      new ResolveModelProviderQuery(prepared.model),
    );
    const messages = await this.runtimeHistoryMaterializer.materialize({
      messages: historyMessages,
      orgId: prepared.orgId,
      backendTools: prepared.backendTools,
      request: {
        instructions: prepared.instructions,
        tools: prepared.tools,
        model: prepared.model,
        tokenEstimator: provider.tokenEstimator,
      },
    });
    const context = RunContext.create({
      orgId: prepared.orgId,
      userId: prepared.userId,
      threadId: prepared.thread.id,
      isAnonymous: prepared.isAnonymous,
    });
    const models = RuntimeModelRegistry.attach(context);
    models.register(provider, prepared.model);
    return {
      events: run({
        instructions: prepared.instructions,
        model: provider,
        messages,
        tools: prepared.tools,
        ...(prepared.tools.length > 0 ? { toolChoice: 'auto' as const } : {}),
        hooks: this.buildHooks(prepared, models, onMessagePersisted),
        context,
        maxIterations: MAX_ITERATIONS,
        retry: RUN_RETRY_CONFIG,
        ...(signal ? { signal } : {}),
      }),
      models,
    };
  }

  private buildHooks(
    prepared: PreparedRun,
    models: RuntimeModelRegistry,
    onMessagePersisted: (messageId: UUID) => void,
  ): Hook[] {
    // Usage must persist before retry evaluation; refresh skills before budgeting,
    // then observe the final request after every request-mutating hook.
    return [
      this.creditGateHookFactory.create({
        principal: { userId: prepared.userId, orgId: prepared.orgId },
        resolveModel: models.resolve,
      }),
      this.usageHookFactory.create({ resolveModel: models.resolve }),
      this.persistenceHookFactory.create({
        onMessagePersisted,
        thread: prepared.thread,
        integrations: prepared.toolIntegrations,
      }),
      this.toolUsageHookFactory.create({
        userId: prepared.userId,
        orgId: prepared.orgId,
        integrations: prepared.toolIntegrations,
      }),
      this.skillActivationHookFactory.create({
        threadId: prepared.thread.id,
        activeSkills: prepared.activeSkills,
        canUseTools: prepared.model.canUseTools,
        isAnonymous: prepared.isAnonymous,
        integrations: prepared.toolIntegrations,
        activatedSkillName: prepared.activatedSkillName,
      }),
      this.contextBudgetHookFactory.create({ model: prepared.model }),
      this.modelCallObservabilityHookFactory.create({
        userId: prepared.userId,
        orgId: prepared.orgId,
        models,
        toolIntegrations: prepared.toolIntegrations,
      }),
    ];
  }
}
