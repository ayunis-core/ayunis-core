import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TranscriptionPort } from '../../ports/transcription.port';
import { TranscribeCommand } from './transcribe.command';
import { ContextService } from 'src/common/context/services/context.service';
import {
  InvalidAudioFileError,
  TranscriptionFailedError,
  UnexpectedTranscriptionError,
} from '../../transcription.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ApplicationError } from 'src/common/errors/base.error';

// 25 MB - matches Mistral's API limit for audio transcription
const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class TranscribeUseCase {
  private readonly logger = new Logger(TranscribeUseCase.name);

  constructor(
    private readonly transcriptionPort: TranscriptionPort,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTranscriptionError)
  async execute(command: TranscribeCommand): Promise<string> {
    this.logger.log('execute', {
      fileName: command.fileName,
      mimeType: command.mimeType,
      language: command.language,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    this.validateAudioFile(command);

    // Call the transcription service
    let transcriptedText: string;
    try {
      transcriptedText = await this.transcriptionPort.transcribe(
        command.file,
        command.fileName,
        command.mimeType,
        command.language,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;

      throw new TranscriptionFailedError(
        error instanceof Error
          ? error.message
          : 'Unknown error during transcription',
      );
    }

    this.logger.log('Transcription completed', {
      fileName: command.fileName,
      textLength: transcriptedText.length,
    });

    return transcriptedText;
  }

  private validateAudioFile(command: TranscribeCommand): void {
    if (command.file.length === 0) {
      throw new InvalidAudioFileError('Empty audio file');
    }

    if (command.file.length > MAX_AUDIO_FILE_SIZE_BYTES) {
      const maxSizeMB = MAX_AUDIO_FILE_SIZE_BYTES / (1024 * 1024);
      throw new InvalidAudioFileError(
        `Audio file size exceeds maximum allowed size of ${maxSizeMB} MB`,
      );
    }

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
  }
}
