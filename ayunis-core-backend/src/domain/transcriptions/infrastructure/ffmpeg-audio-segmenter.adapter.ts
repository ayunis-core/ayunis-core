import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir, mkdtemp, writeFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  AudioSegmenterPort,
  type AudioSegment,
  type AudioSegmentLimits,
  type RecordingInput,
} from 'src/domain/transcriptions/application/ports/audio-segmenter.port';
import {
  InvalidAudioFileError,
  RecordingTooLongError,
  TranscriptionFailedError,
} from 'src/domain/transcriptions/application/transcription.errors';
import {
  assertProcessingActive,
  type ProcessingContext,
} from 'src/common/types/processing-context';

const run = promisify(execFile);
const ENCODED_BYTES_PER_SECOND = 4_000;
const ENCODING_OVERHEAD_BYTES = 4096;

@Injectable()
export class FfmpegAudioSegmenterAdapter extends AudioSegmenterPort {
  private readonly directory: string;
  private readonly maxDuration: number;

  constructor(config: ConfigService) {
    super();
    this.directory =
      config.get<string>('transcription.tempDirectory') ??
      join(tmpdir(), 'ayunis-audio');
    this.maxDuration =
      config.get<number>('transcription.maxDurationSeconds') ?? 10_800;
  }

  async *split(
    input: RecordingInput,
    limits: AudioSegmentLimits,
    context?: ProcessingContext,
  ): AsyncIterable<AudioSegment> {
    this.segmentSeconds(limits);
    await assertProcessingActive(context);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const directory = await mkdtemp(join(this.directory, 'recording-'));
    try {
      const path = 'data' in input ? join(directory, 'input') : input.path;
      if ('data' in input) await writeFile(path, input.data, { mode: 0o600 });
      const size = 'data' in input ? input.data.length : input.size;
      const duration = await this.duration(path, input.mimeType);
      const whole = await this.prepareWhole(
        { path, size, directory, duration },
        input,
        limits,
      );
      if (whole) {
        yield whole;
        return;
      }
      yield* this.splitPrepared(
        { path, directory, duration, mimeType: input.mimeType },
        limits,
        context,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  private async *splitPrepared(
    input: {
      path: string;
      directory: string;
      duration: number;
      mimeType: string;
    },
    limits: AudioSegmentLimits,
    context?: ProcessingContext,
  ): AsyncIterable<AudioSegment> {
    const { path, directory, duration, mimeType } = input;
    const seconds = this.segmentSeconds(limits);
    for (let index = 0; index * seconds < duration; index++) {
      await assertProcessingActive(context);
      const start = index * seconds;
      const length = Math.min(seconds, duration - start);
      const output = join(directory, 'part.mp3');
      await this.convert(path, output, start, length, mimeType);
      if ((await stat(output)).size > limits.maxBytes) {
        throw new InvalidAudioFileError(
          'Encoded audio segment exceeds the byte limit',
        );
      }
      if (!(await this.hasAudioPackets(output))) continue;
      yield {
        path: output,
        start,
        duration: length,
        mimeType: 'audio/mpeg',
        fileName: `part-${index}.mp3`,
        partNumber: index + 1,
      };
      await rm(output, { force: true });
    }
  }

  private async prepareWhole(
    source: { path: string; size: number; directory: string; duration: number },
    input: RecordingInput,
    limits: AudioSegmentLimits,
  ): Promise<AudioSegment | null> {
    const { path, size, directory, duration } = source;
    if (duration > limits.maxSeconds) return null;
    if (size <= limits.maxBytes)
      return {
        path,
        start: 0,
        duration,
        mimeType: input.mimeType,
        fileName: input.fileName,
      };
    if (
      duration * ENCODED_BYTES_PER_SECOND + ENCODING_OVERHEAD_BYTES >
      limits.maxBytes
    )
      return null;
    const prepared = join(directory, 'prepared.mp3');
    await this.convert(path, prepared, 0, duration, input.mimeType);
    if ((await stat(prepared)).size <= limits.maxBytes) {
      return {
        path: prepared,
        start: 0,
        duration,
        mimeType: 'audio/mpeg',
        fileName: 'recording.mp3',
      };
    }
    await rm(prepared, { force: true });
    return null;
  }

  private segmentSeconds(limits: AudioSegmentLimits): number {
    if (
      !Number.isFinite(limits.maxSeconds) ||
      limits.maxSeconds <= 0 ||
      !Number.isSafeInteger(limits.maxBytes) ||
      limits.maxBytes <= ENCODING_OVERHEAD_BYTES + 1000 ||
      !Number.isFinite(this.maxDuration) ||
      this.maxDuration <= 0
    ) {
      throw new Error('Invalid audio segmentation configuration');
    }
    const samples = Math.floor(
      Math.min(
        limits.maxSeconds,
        (limits.maxBytes - ENCODING_OVERHEAD_BYTES) / ENCODED_BYTES_PER_SECOND,
      ) * 16000,
    );
    if (samples < 1)
      throw new Error('Invalid audio segmentation configuration');
    return samples / 16000;
  }

  private async duration(path: string, mimeType: string): Promise<number> {
    const output = await this.execute(
      'ffprobe',
      [
        '-v',
        'error',
        ...this.inputOptions(mimeType),
        '-show_entries',
        'format=duration',
        '-of',
        'json',
        path,
      ],
      15_000,
    );
    const data: unknown = JSON.parse(output);
    const metadata = readDuration(data);
    const duration = Number.isFinite(metadata)
      ? metadata
      : await this.decodedDuration(path, mimeType);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new InvalidAudioFileError('Recording duration could not be read');
    }
    if (duration > this.maxDuration) {
      throw new RecordingTooLongError(
        `Recording of ${Math.round(duration)} s exceeds the ${this.maxDuration} s limit`,
        { durationSeconds: duration, maxDurationSeconds: this.maxDuration },
      );
    }
    return duration;
  }

  private async convert(
    input: string,
    output: string,
    start: number,
    seconds: number,
    mimeType: string,
  ): Promise<void> {
    await this.execute(
      'ffmpeg',
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        String(start),
        ...this.inputOptions(mimeType),
        '-threads',
        '1',
        '-i',
        input,
        '-t',
        String(seconds),
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '32k',
        '-threads',
        '1',
        '-f',
        'mp3',
        '-y',
        output,
      ],
      120_000,
    );
  }

  private async hasAudioPackets(path: string): Promise<boolean> {
    let output: string;
    try {
      output = await this.execute(
        'ffprobe',
        [
          '-v',
          'error',
          ...this.inputOptions('audio/mpeg'),
          '-count_packets',
          '-select_streams',
          'a:0',
          '-show_entries',
          'stream=nb_read_packets',
          '-of',
          'json',
          path,
        ],
        15_000,
      );
    } catch (error) {
      if (
        error instanceof InvalidAudioFileError &&
        (await stat(path)).size < 1024
      )
        return false;
      throw error;
    }
    return packetCount(JSON.parse(output) as unknown) > 0;
  }

  private inputOptions(mimeType: string): string[] {
    const formats = new Map([
      ['audio/mpeg', 'mp3'],
      ['audio/wav', 'wav'],
      ['audio/mp4', 'mov'],
      ['audio/x-m4a', 'mov'],
      ['audio/webm', 'matroska'],
    ]);
    const format = formats.get(mimeType);
    if (!format) throw new InvalidAudioFileError('Unsupported audio format');
    return [
      '-protocol_whitelist',
      'file,pipe',
      '-f',
      format,
      ...(format === 'mov'
        ? ['-enable_drefs', '0', '-use_absolute_path', '0']
        : []),
    ];
  }

  private async decodedDuration(
    path: string,
    mimeType: string,
  ): Promise<number> {
    const progress = await this.execute(
      'ffmpeg',
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        ...this.inputOptions(mimeType),
        '-threads',
        '1',
        '-i',
        path,
        '-t',
        String(this.maxDuration + 1),
        '-map',
        '0:a:0',
        '-vn',
        '-sn',
        '-dn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-threads',
        '1',
        '-progress',
        'pipe:1',
        '-stats_period',
        '1',
        '-f',
        'null',
        '-',
      ],
      120_000,
    );
    const times = [...progress.matchAll(/out_time_us=(\d+)/g)].map(
      (match) => Number(match[1]) / 1_000_000,
    );
    return times.length ? Math.max(...times) : NaN;
  }

  private async execute(
    binary: string,
    args: string[],
    timeout: number,
  ): Promise<string> {
    try {
      const result = await run(binary, args, {
        timeout,
        maxBuffer: 64 * 1024,
        encoding: 'utf8',
        windowsHide: true,
      });
      return result.stdout;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new TranscriptionFailedError(
          'Audio processing requires FFmpeg and ffprobe in the runtime image',
        );
      }
      if ((error as { killed?: boolean }).killed)
        throw new TranscriptionFailedError('Audio preparation timed out');
      throw new InvalidAudioFileError(
        'The recording could not be decoded within the processing limits',
      );
    }
  }
}

function readDuration(data: unknown): number {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('format' in data) ||
    typeof data.format !== 'object' ||
    data.format === null ||
    !('duration' in data.format)
  )
    return NaN;
  return Number(data.format.duration);
}

function packetCount(data: unknown): number {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('streams' in data) ||
    !Array.isArray(data.streams)
  )
    throw new TranscriptionFailedError('Invalid audio packet metadata');
  const stream: unknown = data.streams[0];
  if (typeof stream !== 'object' || stream === null)
    throw new TranscriptionFailedError('Converted segment has no audio stream');
  const count =
    'nb_read_packets' in stream ? Number(stream.nb_read_packets) : 0;
  if (!Number.isSafeInteger(count) || count < 0)
    throw new TranscriptionFailedError('Invalid audio packet count');
  return count;
}
