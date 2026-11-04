import { validateAudio } from 'src/domain/transcriptions/application/util/validate-audio';
import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import { TranscribeCommand } from './transcribe.command';
import { ContextService } from 'src/common/context/services/context.service';
import { TranscriptionFailedError } from 'src/domain/transcriptions/application/transcription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { getRequiredOrgId } from 'src/common/context/required-context';

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
      // Org-scoped rather than user-scoped: the document-processing worker
      // transcribes uploads with only orgId and userId in context (no role).
      getRequiredOrgId(this.contextService);

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
    validateAudio(command.file, command.mimeType);
  }
}
