import type {
  ModelProvider as InferenceProvider,
  ProviderRequest,
} from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { Observable, type Subscriber } from 'rxjs';
import {
  StreamIdleWatchdog,
  STREAM_IDLE_TIMEOUT_MS,
} from 'src/common/streaming/stream-idle-watchdog';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { accumulateResponse } from 'src/domain/models/application/helpers/accumulate-response.helper';
import {
  failedCallOutcome,
  InferenceCallTracker,
} from 'src/domain/models/application/helpers/inference-call-tracker.helper';
import {
  toProviderRequest,
  type ProviderRequestInput,
} from 'src/domain/models/application/mappers/provider-request.mapper';
import { toStreamChunk } from 'src/domain/models/application/mappers/stream-chunk.mapper';
import { InferenceStreamStalledError } from 'src/domain/models/application/models.errors';
import type { InferenceCallTerminalHandler } from 'src/domain/models/application/models/inference-call-terminal';
import type { InferenceResponse } from 'src/domain/models/application/models/inference-response';
import type { StreamInferenceResponseChunk } from 'src/domain/models/application/models/stream-inference-response-chunk';
import { InferenceProviderRegistry } from 'src/domain/models/application/registry/inference-provider.registry';
import type { Model } from 'src/domain/models/domain/model.entity';

export interface InferenceCall extends ProviderRequestInput {
  model: Model;
  onCallTerminal?: InferenceCallTerminalHandler;
}

/**
 * Drives exactly one provider call for direct (non-agent) inference, either
 * to a complete response or as a chunk stream. Retrying is the caller's
 * decision: a hidden retry here would multiply billable upstream calls.
 */
@Injectable()
export class InferenceCallService {
  constructor(
    private readonly inferenceProviderRegistry: InferenceProviderRegistry,
    private readonly imageContentService: ImageContentService,
  ) {}

  async complete(call: InferenceCall): Promise<InferenceResponse> {
    const provider = this.inferenceProviderRegistry.resolve(call.model);
    const request = await toProviderRequest(call, this.imageContentService);
    const tracker = new InferenceCallTracker();
    let response: InferenceResponse;
    try {
      response = await accumulateResponse(
        tracker.track(provider.stream(request)),
      );
    } catch (error) {
      await tracker.settle(failedCallOutcome(error), call.onCallTerminal);
      throw error;
    }
    await tracker.settle('completed', call.onCallTerminal);
    return response;
  }

  /** Unsubscribing (client disconnect, downstream error) aborts the call. */
  stream(call: InferenceCall): Observable<StreamInferenceResponseChunk> {
    const provider = this.inferenceProviderRegistry.resolve(call.model);
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      const controller = new AbortController();
      void this.streamResponse(provider, call, subscriber, controller);
      // Without the abort the stream runs to completion unread and the
      // tokens are billed for nobody.
      return () => controller.abort();
    });
  }

  private async streamResponse(
    provider: InferenceProvider,
    call: InferenceCall,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
    controller: AbortController,
  ): Promise<void> {
    const watchdog = new StreamIdleWatchdog(STREAM_IDLE_TIMEOUT_MS, () =>
      controller.abort(new InferenceStreamStalledError(STREAM_IDLE_TIMEOUT_MS)),
    );
    try {
      const request = await toProviderRequest(call, this.imageContentService);
      await this.streamCall(
        provider,
        { ...request, signal: controller.signal },
        {
          call,
          subscriber,
          watchdog,
        },
      );
      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    } finally {
      watchdog.stop();
    }
  }

  private async streamCall(
    provider: InferenceProvider,
    request: ProviderRequest,
    context: {
      call: InferenceCall;
      subscriber: Subscriber<StreamInferenceResponseChunk>;
      watchdog: StreamIdleWatchdog;
    },
  ): Promise<void> {
    const { call, subscriber, watchdog } = context;
    const tracker = new InferenceCallTracker();
    try {
      for await (const chunk of tracker.track(provider.stream(request))) {
        watchdog.notifyChunk();
        subscriber.next(toStreamChunk(chunk));
      }
    } catch (error) {
      // Stop first so slow accounting cannot be mistaken for a stall.
      watchdog.stop();
      await tracker.settle(
        failedCallOutcome(error, request.signal),
        call.onCallTerminal,
      );
      throw stallReasonOr(error, request.signal);
    }
    watchdog.stop();
    await tracker.settle('completed', call.onCallTerminal);
  }
}

function stallReasonOr(error: unknown, signal?: AbortSignal): unknown {
  const reason: unknown = signal?.reason;
  return reason instanceof InferenceStreamStalledError ? reason : error;
}
