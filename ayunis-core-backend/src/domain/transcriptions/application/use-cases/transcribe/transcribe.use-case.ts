import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import { TranscribeCommand } from './transcribe.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  TranscriptionFailedError,
  InvalidAudioFileError,
} from 'src/domain/transcriptions/application/transcription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

// 25 MB - matches Mistral's API limit for audio transcription
const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
];

@Injectable()
export class TranscribeUseCase {
  private readonly logger = new Logger(TranscribeUseCase.name);

  constructor(
    private readonly transcriptionPort: TranscriptionPort,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: TranscribeCommand): Promise<string> {
    this.logger.log(
      {
        fileName: command.fileName,
        mimeType: command.mimeType,
        language: command.language,
      },
      'execute',
    );

    try {
      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new UnauthorizedAccessError();
      }

      this.validateAudio(command);

      const transcriptedText = await this.transcriptionPort.transcribe(
        command.file,
        command.fileName,
        command.mimeType,
        command.language,
      );

      this.logger.log(
        {
          fileName: command.fileName,
          textLength: transcriptedText.length,
        },
        'Transcription completed',
      );

      return transcriptedText;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        { err: error as Error, fileName: command.fileName },
        'Failed to transcribe audio',
      );
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error during transcription';
      throw new TranscriptionFailedError(message);
    }
  }

  private validateAudio(command: TranscribeCommand): void {
    if (command.file.length === 0) {
      throw new InvalidAudioFileError('Empty audio file');
    }
    if (command.file.length > MAX_AUDIO_FILE_SIZE_BYTES) {
      const maxSizeMB = MAX_AUDIO_FILE_SIZE_BYTES / (1024 * 1024);
      throw new InvalidAudioFileError(
        `Audio file size exceeds maximum allowed size of ${maxSizeMB} MB`,
      );
    }
    if (!SUPPORTED_MIME_TYPES.includes(command.mimeType)) {
      throw new InvalidAudioFileError(
        `Unsupported audio format: ${command.mimeType}`,
      );
    }
  }
}
