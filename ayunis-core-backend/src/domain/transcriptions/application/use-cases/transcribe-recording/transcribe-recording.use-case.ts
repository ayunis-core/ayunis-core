import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import pLimit from 'p-limit';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { assertProcessingActive } from 'src/common/types/processing-context';
import {
  AudioSegmenterPort,
  type AudioSegment,
  type AudioSegmentLimits,
} from 'src/domain/transcriptions/application/ports/audio-segmenter.port';
import { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import {
  InvalidAudioFileError,
  UnexpectedTranscriptionError,
} from 'src/domain/transcriptions/application/transcription.errors';
import {
  MAX_AUDIO_FILE_SIZE_BYTES,
  validateAudio,
} from 'src/domain/transcriptions/application/util/validate-audio';
import type { RecordingTranscript } from 'src/domain/transcriptions/domain/recording-transcript';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';
import {
  restoreTranscript,
  formatTranscript,
} from './recording-transcript.helpers';

@Injectable()
export class TranscribeRecordingUseCase {
  private readonly logger = new Logger(TranscribeRecordingUseCase.name);
  private readonly limits: AudioSegmentLimits;
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly model: string;

  constructor(
    private readonly segmenter: AudioSegmenterPort,
    private readonly transcription: TranscriptionPort,
    private readonly contextService: ContextService,
    config: ConfigService,
  ) {
    this.limits = {
      maxSeconds: positive(config.get('transcription.segmentSeconds', 600)),
      maxBytes: positive(
        config.get('transcription.segmentBytes', 20 * 1024 * 1024),
      ),
    };
    if (this.limits.maxBytes > MAX_AUDIO_FILE_SIZE_BYTES)
      throw new Error(
        'Audio segment bytes exceed the application request limit',
      );
    this.limit = pLimit(positive(config.get('transcription.concurrency', 2)));
    this.model =
      config.get<string>('models.mistral.transcriptionModel') ??
      'voxtral-mini-latest';
  }

  @HandleUnexpectedErrors(UnexpectedTranscriptionError)
  async execute(command: TranscribeCommand): Promise<string> {
    this.logger.log(
      { fileName: command.fileName },
      'Transcribing uploaded recording',
    );
    getRequiredOrgId(this.contextService);
    validateAudio(command.file, command.mimeType);
    await assertProcessingActive(command.processingContext);
    const identity = createHash('sha256').update(command.file).digest('hex');
    const lines: string[] = [];
    let completed = 0;
    const input = {
      data: command.file,
      fileName: command.fileName,
      mimeType: command.mimeType,
    };
    for await (const segment of this.segmenter.split(
      input,
      this.limits,
      command.processingContext,
    )) {
      const result = await this.transcribePart(command, segment, identity);
      lines.push(...formatTranscript(result, segment));
      await command.processingContext?.progress(++completed);
    }
    if (lines.length === 0)
      throw new InvalidAudioFileError(
        'No speech was detected in the recording',
      );
    return lines.join('\n');
  }

  private async transcribePart(
    command: TranscribeCommand,
    segment: AudioSegment,
    identity: string,
  ): Promise<RecordingTranscript> {
    const key = createHash('sha256')
      .update(
        `audio-v1:${this.model}:${identity}:${command.language ?? ''}:${segment.start}:${segment.duration}`,
      )
      .digest('hex');
    const saved = await command.processingContext?.read(key);
    if (saved !== undefined) return restoreTranscript(saved, segment.duration);
    if ((await stat(segment.path)).size > this.limits.maxBytes)
      throw new InvalidAudioFileError(
        'Audio segment exceeds the request byte limit',
      );
    const data = await readFile(segment.path);
    const result = await this.limit(async () => {
      await assertProcessingActive(command.processingContext);
      return this.transcription.transcribeSegment(
        data,
        segment.fileName,
        segment.mimeType,
        command.language,
      );
    });
    const json = JSON.stringify(result);
    const validated = restoreTranscript(json, segment.duration);
    await command.processingContext?.write(key, json);
    return validated;
  }
}

function positive(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error('Invalid audio processing configuration');
  return value;
}
