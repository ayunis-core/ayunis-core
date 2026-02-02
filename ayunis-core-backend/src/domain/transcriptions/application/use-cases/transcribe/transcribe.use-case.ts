import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionPort } from '../../ports/transcription.port';
import { TranscribeCommand } from './transcribe.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  TranscriptionFailedError,
  InvalidAudioFileError,
} from '../../transcription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

@Injectable()
export class TranscribeUseCase {
  private readonly logger = new Logger(TranscribeUseCase.name);

  constructor(
    private readonly transcriptionPort: TranscriptionPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: TranscribeCommand): Promise<string> {
    this.logger.log('execute', {
      fileName: command.fileName,
      mimeType: command.mimeType,
      language: command.language,
    });

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      // Validate audio file
      if (!command.file || command.file.length === 0) {
        throw new InvalidAudioFileError('Empty audio file');
      }

      // Basic MIME type validation
      const supportedMimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'audio/x-m4a',
      ];
      if (!supportedMimeTypes.includes(command.mimeType)) {
        throw new InvalidAudioFileError(
          `Unsupported audio format: ${command.mimeType}`,
        );
      }

      // Call the transcription service
      const transcriptedText = await this.transcriptionPort.transcribe(
        command.file,
        command.fileName,
        command.language,
      );

      this.logger.log('Transcription completed', {
        fileName: command.fileName,
        textLength: transcriptedText.length,
      });

      return transcriptedText;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to transcribe audio', {
        fileName: command.fileName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new TranscriptionFailedError(
        (error as Error)?.message ?? 'Unknown error during transcription',
      );
    }
  }
}
