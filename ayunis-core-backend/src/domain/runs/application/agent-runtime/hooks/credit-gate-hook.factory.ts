import { AgentRuntimeError, type Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import type { RuntimeLanguageModelResolver } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import {
  InferenceUsageGuard,
  type InferencePrincipal,
} from 'src/domain/runs/application/services/inference-usage-guard.service';

interface CreditGateHookParams {
  principal: InferencePrincipal;
  resolveModel: RuntimeLanguageModelResolver;
}

@Injectable()
export class CreditGateHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: CreditGateHookParams): Hook {
    return {
      name: 'ayunis-credit-gate',
      inheritToChildRuns: true,
      beforeModelCall: async (ctx) => {
        try {
          await this.inferenceUsageGuard.ensureModelCallAllowed(
            params.principal,
            params.resolveModel(ctx.model),
          );
        } catch (error) {
          if (!(error instanceof ApplicationError)) throw error;
          throw new AgentRuntimeError(error.code, error.message, {
            details: { ...error.metadata, modelTurn: ctx.turn },
            cause: error,
          });
        }
      },
    };
  }
}
