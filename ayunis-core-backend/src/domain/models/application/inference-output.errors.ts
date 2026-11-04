import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum InferenceOutputErrorCode {
  INFERENCE_OUTPUT_LIMIT = 'INFERENCE_OUTPUT_LIMIT',
}

/**
 * The model spent its whole output budget (typically on thinking) without an
 * answer. Expected for oversized requests, so status 400 keeps it out of
 * AppSignal incidents; the "Model call rejected" log still records it.
 */
export class InferenceOutputLimitError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Inference failed: model exhausted the output token limit without an answer',
      InferenceOutputErrorCode.INFERENCE_OUTPUT_LIMIT,
      400,
      metadata,
    );
  }
}
