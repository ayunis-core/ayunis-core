import { Injectable, Logger } from '@nestjs/common';
import { TextToSpeechPort } from '../../ports/text-to-speech.port';
import { SynthesizeSpeechCommand } from './synthesize-speech.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  InvalidSpeechInputError,
  SpeechSynthesisFailedError,
} from '../../speech.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

// Bounds TTS cost and latency; the frontend truncates to the same limit
export const MAX_TTS_INPUT_CHARS = 5000;

@Injectable()
export class SynthesizeSpeechUseCase {
  private readonly logger = new Logger(SynthesizeSpeechUseCase.name);

  constructor(
    private readonly textToSpeechPort: TextToSpeechPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: SynthesizeSpeechCommand): Promise<Buffer> {
    this.logger.log('execute', { inputLength: command.input.length });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      if (!command.input || command.input.trim().length === 0) {
        throw new InvalidSpeechInputError('Empty speech input');
      }

      if (command.input.length > MAX_TTS_INPUT_CHARS) {
        throw new InvalidSpeechInputError(
          `Speech input exceeds maximum length of ${MAX_TTS_INPUT_CHARS} characters`,
        );
      }

      const audio = await this.textToSpeechPort.synthesize(command.input);

      this.logger.log('Speech synthesis completed', {
        audioBytes: audio.length,
      });

      return audio;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to synthesize speech', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new SpeechSynthesisFailedError(
        error instanceof Error
          ? error.message
          : 'Unknown error during speech synthesis',
      );
    }
  }
}
