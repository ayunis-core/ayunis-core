import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import transcriptionConfig from 'src/config/transcription.config';
import { FfmpegAudioSegmenterAdapter } from './ffmpeg-audio-segmenter.adapter';
import { RecordingTooLongError } from 'src/domain/transcriptions/application/transcription.errors';

function wav(seconds: number): Buffer {
  const dataBytes = Math.round(seconds * 16000) * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
}

describe('FFmpeg audio segmentation', () => {
  const directory = join(
    process.cwd(),
    'uploads',
    `audio-test-${randomUUID()}`,
  );
  const segmenter = new FfmpegAudioSegmenterAdapter(
    new ConfigService({
      transcription: { tempDirectory: directory },
    }),
  );
  const input = (seconds: number) => ({
    data: wav(seconds),
    fileName: 'meeting.wav',
    mimeType: 'audio/wav',
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('compresses an oversized recording whole when the encoded audio fits', async () => {
    const parts = [];
    for await (const part of segmenter.split(input(12), {
      maxSeconds: 20,
      maxBytes: 100_000,
    })) {
      const data = await readFile(part.path);
      expect(data.length).toBeLessThan(100_000);
      expect(part.mimeType).toBe('audio/mpeg');
      parts.push(part);
    }
    expect(parts).toHaveLength(1);
    expect(parts[0].partNumber).toBeUndefined();
  });

  it('produces valid compressed segments with original time offsets and bounded bytes', async () => {
    const segments = [];
    for await (const segment of segmenter.split(input(2.25), {
      maxSeconds: 1,
      maxBytes: 40_000,
    })) {
      const bytes = await readFile(segment.path);
      expect(segment.mimeType).toBe('audio/mpeg');
      const { stdout } = await promisify(execFile)('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_name',
        '-of',
        'csv=p=0',
        segment.path,
      ]);
      expect(stdout.trim()).toBe('mp3');
      expect(bytes.length).toBeLessThanOrEqual(40_000);
      segments.push(segment);
    }
    expect(segments.map((segment) => segment.start)).toEqual([0, 1, 2]);
    expect(segments.map((segment) => segment.duration)).toEqual([1, 1, 0.25]);
    expect(await readdir(directory)).toEqual([]);
  });

  it.each([
    { seconds: 2, maxSeconds: 1, starts: [0, 1] },
    { seconds: 600, maxSeconds: 600, starts: [0] },
  ])(
    'emits only nonempty audio parts at the $seconds-second WebM boundary',
    async ({ seconds, maxSeconds, starts }) => {
      await mkdir(directory, { recursive: true });
      const path = join(directory, 'boundary.webm');
      const offsets: number[] = [];
      try {
        await promisify(execFile)('ffmpeg', [
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'lavfi',
          '-i',
          `sine=frequency=440:duration=${seconds}`,
          '-c:a',
          'libopus',
          '-y',
          path,
        ]);
        const recording = {
          data: await readFile(path),
          fileName: 'meeting.webm',
          mimeType: 'audio/webm',
        };
        for await (const segment of segmenter.split(recording, {
          maxSeconds,
          maxBytes: 20 * 1024 * 1024,
        })) {
          const bytes = await readFile(segment.path);
          expect(bytes.length).toBeGreaterThan(0);
          offsets.push(segment.start);
        }
        expect(offsets.slice(0, starts.length)).toEqual(starts);
        expect(offsets.length).toBeLessThanOrEqual(starts.length + 1);
      } finally {
        await rm(path, { force: true });
      }
    },
    20_000,
  );

  it('preserves a final segment containing only one audio sample', async () => {
    const sizes: number[] = [];
    for await (const segment of segmenter.split(input(1 + 1 / 16000), {
      maxSeconds: 1,
      maxBytes: 40_000,
    })) {
      const bytes = await readFile(segment.path);
      expect(bytes.length).toBeGreaterThan(0);
      sizes.push(segment.duration);
    }
    expect(sizes).toHaveLength(2);
    expect(sizes[0]).toBe(1);
    expect(sizes[1]).toBeCloseTo(1 / 16000, 5);
  });

  it('uses the default directory when the environment example leaves it blank', async () => {
    const previous = process.env.AUDIO_TEMP_DIRECTORY;
    process.env.AUDIO_TEMP_DIRECTORY = '';
    const temporaryRoot = jest.spyOn(os, 'tmpdir').mockReturnValue(directory);
    const prepared: Buffer[] = [];
    try {
      const configured = new FfmpegAudioSegmenterAdapter(
        new ConfigService({ transcription: transcriptionConfig() }),
      );
      for await (const segment of configured.split(input(0.5), {
        maxSeconds: 1,
        maxBytes: 40_000,
      })) {
        expect(segment.path.startsWith(join(directory, 'ayunis-audio'))).toBe(
          true,
        );
        prepared.push(await readFile(segment.path));
      }
      expect(prepared).toEqual([wav(0.5)]);
    } finally {
      temporaryRoot.mockRestore();
      if (previous === undefined) delete process.env.AUDIO_TEMP_DIRECTORY;
      else process.env.AUDIO_TEMP_DIRECTORY = previous;
      await rm(join(directory, 'ayunis-audio'), {
        recursive: true,
        force: true,
      });
    }
  });

  it('rejects a recording longer than the duration cap as too long', async () => {
    const capped = new FfmpegAudioSegmenterAdapter(
      new ConfigService({
        transcription: { tempDirectory: directory, maxDurationSeconds: 1 },
      }),
    );
    const read = async () => {
      const parts = [];
      for await (const part of capped.split(input(2), {
        maxSeconds: 10,
        maxBytes: 1_000_000,
      }))
        parts.push(part);
      return parts;
    };

    await expect(read()).rejects.toBeInstanceOf(RecordingTooLongError);
  });

  it('sends a small recording as one original file', async () => {
    for await (const segment of segmenter.split(input(0.5), {
      maxSeconds: 1,
      maxBytes: 40_000,
    })) {
      expect(await readFile(segment.path)).toEqual(wav(0.5));
      expect(segment.start).toBe(0);
    }
  });

  it('accepts browser-style WebM with no container duration', async () => {
    const { stdout } = await promisify(execFile)(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=1',
        '-c:a',
        'libopus',
        '-f',
        'webm',
        'pipe:1',
      ],
      { encoding: 'buffer' },
    );
    const recording = {
      data: stdout,
      fileName: 'browser.webm',
      mimeType: 'audio/webm',
    };
    for await (const segment of segmenter.split(recording, {
      maxSeconds: 2,
      maxBytes: 40_000,
    })) {
      expect(segment.duration).toBeGreaterThan(0.9);
      expect(segment.duration).toBeLessThan(1.1);
    }
  });

  it('accepts M4A recordings with the restricted MOV demuxer', async () => {
    const { stdout } = await promisify(execFile)(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=1',
        '-c:a',
        'aac',
        '-f',
        'mp4',
        '-movflags',
        'frag_keyframe+empty_moov',
        'pipe:1',
      ],
      { encoding: 'buffer' },
    );
    const recording = {
      data: stdout,
      fileName: 'meeting.m4a',
      mimeType: 'audio/x-m4a',
    };
    let count = 0;
    for await (const segment of segmenter.split(recording, {
      maxSeconds: 0.5,
      maxBytes: 40_000,
    })) {
      expect(segment.duration).toBeLessThanOrEqual(0.5);
      expect(segment.mimeType).toBe('audio/mpeg');
      expect((await readFile(segment.path)).length).toBeGreaterThan(0);
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('cleans input and output files when processing stops after a segment', async () => {
    for await (const segment of segmenter.split(input(2), {
      maxSeconds: 1,
      maxBytes: 40_000,
    })) {
      expect(segment.start).toBe(0);
      break;
    }
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejects unreadable audio and removes its temporary directory', async () => {
    const collect = async () => {
      for await (const segment of segmenter.split(
        {
          data: Buffer.from('broken audio'),
          fileName: 'meeting.mp3',
          mimeType: 'audio/mpeg',
        },
        { maxSeconds: 1, maxBytes: 40_000 },
      )) {
        expect(segment.duration).toBeGreaterThan(0);
      }
    };
    await expect(collect()).rejects.toThrow('could not be decoded');
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejects a byte budget too small for even one audio sample', async () => {
    const iterator = segmenter
      .split(input(1), { maxSeconds: 1, maxBytes: 4097 })
      [Symbol.asyncIterator]();
    try {
      await expect(iterator.next()).rejects.toThrow('configuration');
    } finally {
      await iterator.return?.();
    }
  });
});
