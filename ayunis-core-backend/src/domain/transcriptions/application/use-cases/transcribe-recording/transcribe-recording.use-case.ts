import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_AUDIO_UPLOAD_BYTES } from 'src/config/transcription.config';
import { createHash } from 'crypto';
import { stat } from 'fs/promises';
import pLimit from 'p-limit';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { assertProcessingActive } from 'src/common/types/processing-context';
import {
  AudioSegmenterPort,
  type AudioSegment,
  type AudioSegmentLimits,
  type RecordingInput,
} from 'src/domain/transcriptions/application/ports/audio-segmenter.port';
import { TranscriptionPort } from 'src/domain/transcriptions/application/ports/transcription.port';
import {
  InvalidAudioFileError,
  UnexpectedTranscriptionError,
} from 'src/domain/transcriptions/application/transcription.errors';
import { validateAudio } from 'src/domain/transcriptions/application/util/validate-audio';
import type {
  RecordingTranscript,
  TranscriptSegment,
} from 'src/domain/transcriptions/domain/recording-transcript';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';
import {
  restoreTranscript,
  formatTranscript,
  toRecordingSegments,
} from './recording-transcript.helpers';

@Injectable()
export class TranscribeRecordingUseCase {
  private readonly logger = new Logger(TranscribeRecordingUseCase.name);
  private readonly limits: AudioSegmentLimits;
  private readonly maxUploadBytes: number;
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly model: string;

  constructor(
    private readonly segmenter: AudioSegmenterPort,
    private readonly transcription: TranscriptionPort,
    private readonly contextService: ContextService,
    config: ConfigService,
  ) {
    this.limits = {
      maxSeconds: positive(config.get('transcription.segmentSeconds', 10_800)),
      maxBytes: positive(
        config.get('transcription.segmentBytes', 25 * 1024 * 1024),
      ),
    };
    this.maxUploadBytes = positive(
      config.get('transcription.maxUploadBytes', DEFAULT_AUDIO_UPLOAD_BYTES),
    );
    this.limit = pLimit(positive(config.get('transcription.concurrency', 2)));
    this.model =
      config.get<string>('models.mistral.transcriptionModel') ??
      'voxtral-mini-2602';
  }

  /**
   * Returns the readable transcript text, plus its segments in recording time
   * with the provider's speaker labels kept apart from the text.
   */
  @HandleUnexpectedErrors(UnexpectedTranscriptionError)
  async execute(command: TranscribeCommand): Promise<RecordingTranscript> {
    this.logger.log(
      { fileName: command.fileName },
      'Transcribing uploaded recording',
    );
    getRequiredOrgId(this.contextService);
    const { recording, fileName, mimeType } = command;
    validateAudio(recording ?? command.file, mimeType, this.maxUploadBytes);
    await assertProcessingActive(command.processingContext);
    const identity =
      recording?.sha256 ??
      createHash('sha256').update(command.file).digest('hex');
    const lines: string[] = [];
    const segments: TranscriptSegment[] = [];
    let completed = 0;
    const input: RecordingInput = recording
      ? { path: recording.path, size: recording.size, fileName, mimeType }
      : { data: command.file, fileName, mimeType };
    for await (const segment of this.segmenter.split(
      input,
      this.limits,
      command.processingContext,
    )) {
      const result = await this.transcribePart(command, segment, identity);
      lines.push(...formatTranscript(result, segment));
      segments.push(...toRecordingSegments(result, segment));
      await command.processingContext?.progress(++completed);
    }
    if (lines.length === 0)
      throw new InvalidAudioFileError(
        'No speech was detected in the recording',
      );
    return { text: lines.join('\n'), segments };
  }

  private async transcribePart(
    command: TranscribeCommand,
    segment: AudioSegment,
    identity: string,
  ): Promise<RecordingTranscript> {
    const key = createHash('sha256')
      .update(
        `audio-diarized-v2:${this.model}:${identity}:${command.language ?? ''}:${segment.start}:${segment.duration}`,
      )
      .digest('hex');
    const saved = await command.processingContext?.read(key);
    if (saved !== undefined) return restoreTranscript(saved, segment.duration);
    const { size } = await stat(segment.path);
    if (size > this.limits.maxBytes)
      throw new InvalidAudioFileError(
        'Audio segment exceeds the request byte limit',
      );
    const result = await this.limit(async () => {
      await assertProcessingActive(command.processingContext);
      return this.transcription.transcribeSegment(
        { path: segment.path, size },
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
