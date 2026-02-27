import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { Message } from 'src/domain/messages/domain/message.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import {
  AYUNIS_INFERENCE_DURATION_SECONDS,
  AYUNIS_INFERENCE_ERRORS_TOTAL,
} from 'src/metrics/metrics.constants';
import { recordInferenceMetrics } from 'src/metrics/record-inference-metrics.helper';

/**
 * Executes non-streaming inference with metrics instrumentation.
 */
@Injectable()
export class NonStreamingInferenceService {
  private readonly logger = new Logger(NonStreamingInferenceService.name);

  constructor(
    private readonly getInferenceUseCase: GetInferenceUseCase,
    @InjectMetric(AYUNIS_INFERENCE_DURATION_SECONDS)
    private readonly inferenceHistogram: Histogram<string>,
    @InjectMetric(AYUNIS_INFERENCE_ERRORS_TOTAL)
    private readonly inferenceErrorsCounter: Counter<string>,
  ) {}

  async execute(params: {
    model: LanguageModel;
    messages: Message[];
    tools: Tool[];
    instructions?: string;
  }): Promise<InferenceResponse> {
    const startTime = Date.now();
    const metricsOpts = {
      histogram: this.inferenceHistogram,
      errorCounter: this.inferenceErrorsCounter,
      logger: this.logger,
      model: params.model.name,
      provider: params.model.provider,
      streaming: 'false' as const,
    };

    let inferenceError: unknown;
    try {
      return await this.getInferenceUseCase.execute(
        new GetInferenceCommand({
          model: params.model,
          messages: params.messages,
          tools: params.tools,
          toolChoice: ModelToolChoice.AUTO,
          instructions: params.instructions,
        }),
      );
    } catch (error) {
      inferenceError = error;
      throw error;
    } finally {
      recordInferenceMetrics(
        metricsOpts,
        Date.now() - startTime,
        inferenceError,
      );
    }
  }
}
