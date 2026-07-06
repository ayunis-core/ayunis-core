import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

/**
 * Error codes specific to the Speech domain
 */
export enum SpeechErrorCode {
  SPEECH_SYNTHESIS_FAILED = 'SPEECH_SYNTHESIS_FAILED',
  INVALID_SPEECH_INPUT = 'INVALID_SPEECH_INPUT',
  SPEECH_SERVICE_UNAVAILABLE = 'SPEECH_SERVICE_UNAVAILABLE',
}

/**
 * Base speech error that all speech-specific errors should extend
 */
export abstract class SpeechError extends ApplicationError {
  constructor(
    message: string,
    code: SpeechErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class SpeechSynthesisFailedError extends SpeechError {
  constructor(
    message: string = 'Speech synthesis failed',
    metadata?: ErrorMetadata,
  ) {
    super(message, SpeechErrorCode.SPEECH_SYNTHESIS_FAILED, 500, metadata);
  }
}

export class InvalidSpeechInputError extends SpeechError {
  constructor(
    message: string = 'Invalid speech input',
    metadata?: ErrorMetadata,
  ) {
    super(message, SpeechErrorCode.INVALID_SPEECH_INPUT, 400, metadata);
  }
}

export class SpeechServiceUnavailableError extends SpeechError {
  constructor(
    message: string = 'Speech service unavailable',
    metadata?: ErrorMetadata,
  ) {
    super(message, SpeechErrorCode.SPEECH_SERVICE_UNAVAILABLE, 503, metadata);
  }
}
