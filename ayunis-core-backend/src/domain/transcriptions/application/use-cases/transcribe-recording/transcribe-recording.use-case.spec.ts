import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { TranscribeRecordingUseCase } from './transcribe-recording.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';

describe('uploaded recording transcription', () => {
  const directory = join(
    process.cwd(),
    'uploads',
    `recording-test-${randomUUID()}`,
  );
  const cache = new Map<string, string>();
  let active: boolean;
  let requests: number;
  let failSecond: boolean;
  const context = {
    read: async (key: string) => cache.get(key),
    write: async (key: string, value: string) => {
      cache.set(key, value);
    },
    isActive: async () => active,
    progress: () => Promise.resolve(),
  };

  function useCase(config = new ConfigService()) {
    const segmenter = {
      split: async function* () {
        for (let index = 0; index < 2; index++)
          yield {
            path: join(directory, `${index}.wav`),
            start: index * 600,
            duration: 600,
            mimeType: 'audio/wav',
            fileName: `${index}.wav`,
          };
      },
    };
    const provider = {
      transcribeSegment: async () => {
        requests++;
        if (requests === 2 && failSecond) throw new Error('provider timeout');
        return {
          text: 'Council decision.',
          segments: [{ text: 'Council decision.', start: 1.25, end: 3.5 }],
        };
      },
    };
    return new TranscribeRecordingUseCase(
      segmenter,
      provider as never,
      { get: () => '604a15e4-563b-44f9-bef6-a67ba9b5c05f' } as never,
      config,
    );
  }

  const command = () =>
    new TranscribeCommand({
      file: Buffer.from('meeting recording'),
      fileName: 'meeting.mp3',
      mimeType: 'audio/mpeg',
      processingContext: context,
    });

  beforeAll(async () => {
    await mkdir(directory, { recursive: true });
    await Promise.all(
      [0, 1].map((i) => writeFile(join(directory, `${i}.wav`), 'audio bytes')),
    );
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(() => {
    cache.clear();
    active = true;
    requests = 0;
    failSecond = false;
  });

  it('accepts a segment budget above the dictation cap so long recordings stay whole', async () => {
    const whole = useCase(
      new ConfigService({
        transcription: {
          segmentBytes: 48 * 1024 * 1024,
          segmentSeconds: 10_800,
        },
      }),
    );

    await expect(whole.execute(command())).resolves.toContain(
      'Council decision.',
    );
  });

  it('rejects a recording above the configured upload cap', async () => {
    const capped = useCase(
      new ConfigService({ transcription: { maxUploadBytes: 4 } }),
    );

    await expect(capped.execute(command())).rejects.toMatchObject({
      code: 'INVALID_AUDIO_FILE',
      message: expect.stringContaining('exceeds maximum allowed size'),
    });
    expect(requests).toBe(0);
  });

  it('transcribes a recording handed over as a file on disk', async () => {
    const onDisk = new TranscribeCommand({
      file: Buffer.alloc(0),
      recording: { path: join(directory, '0.wav'), size: 10, sha256: 'ab' },
      fileName: 'meeting.wav',
      mimeType: 'audio/wav',
      processingContext: context,
    });

    await expect(useCase().execute(onDisk)).resolves.toContain(
      'Council decision.',
    );
    expect(requests).toBe(2);
  });

  it('adds original recording offsets to provider timestamps', async () => {
    const text = await useCase().execute(command());
    expect(text).toContain('[00:00:01.250 - 00:00:03.500] Council decision.');
    expect(text).toContain('[00:10:01.250 - 00:10:03.500] Council decision.');
  });

  it('resumes after a failed request without repeating completed transcription', async () => {
    failSecond = true;
    await expect(useCase().execute(command())).rejects.toThrow();
    failSecond = false;
    expect(await useCase().execute(command())).toContain('00:10:01.250');
    expect(requests).toBe(3);
  });

  it('refuses processing after cancellation or deletion', async () => {
    active = false;
    await expect(useCase().execute(command())).rejects.toThrow(
      'no longer active',
    );
    expect(requests).toBe(0);
  });
});
