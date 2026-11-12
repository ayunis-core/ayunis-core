import { ConfigService } from '@nestjs/config';
import { createServer, type Server } from 'http';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';
import { FfmpegAudioSegmenterAdapter } from 'src/domain/transcriptions/infrastructure/ffmpeg-audio-segmenter.adapter';
import { MistralTranscriptionService } from 'src/domain/transcriptions/infrastructure/mistral-transcription.service';
import { TranscribeRecordingUseCase } from './transcribe-recording.use-case';
import { TranscribeCommand } from 'src/domain/transcriptions/application/use-cases/transcribe/transcribe.command';
import type { ContextService } from 'src/common/context/services/context.service';

function recording(seconds: number): Buffer {
  const size = seconds * 32000;
  const data = Buffer.alloc(size + 44);
  data.write('RIFF');
  data.writeUInt32LE(size + 36, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24);
  data.writeUInt32LE(32000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(size, 40);
  return data;
}

describe('recording preparation and Mistral SDK contract', () => {
  let server: Server;
  let url: string;
  const requests: string[] = [];
  const directory = join(
    process.cwd(),
    'uploads',
    `audio-contract-${randomUUID()}`,
  );
  beforeAll(async () => {
    server = createServer((request, response) => {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        requests.push(Buffer.concat(chunks).toString('latin1'));
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            text: 'Budget approved.',
            language: null,
            model: 'voxtral-mini-2602',
            usage: {
              prompt_audio_seconds: 1,
              prompt_tokens: 0,
              total_tokens: 0,
              completion_tokens: 0,
              request_count: 1,
            },
            segments: [
              {
                type: 'transcription_segment',
                text: 'Budget approved.',
                start: 0.1,
                end: 0.9,
                speaker_id: 'speaker_1',
              },
            ],
          }),
        );
      })().catch((error: unknown) => {
        response.writeHead(500);
        response.end(String(error));
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('No test server address');
    url = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(() => {
    requests.length = 0;
  });

  function useCase(maxSeconds: number) {
    const config = new ConfigService({
      models: {
        mistral: {
          apiKey: 'test-key',
          transcriptionModel: 'voxtral-mini-2602',
          transcriptionServerUrl: url,
        },
      },
      transcription: {
        tempDirectory: directory,
        segmentSeconds: maxSeconds,
        segmentBytes: 100000,
      },
    });
    return new TranscribeRecordingUseCase(
      new FfmpegAudioSegmenterAdapter(config),
      new MistralTranscriptionService(config),
      { get: () => randomUUID() } as unknown as ContextService,
      config,
    );
  }

  it('compresses a fitting recording whole and preserves SDK speaker ids', async () => {
    const { text, segments } = await useCase(20).execute(
      new TranscribeCommand({
        file: recording(12),
        fileName: 'meeting.wav',
        mimeType: 'audio/wav',
      }),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('audio/mpeg');
    expect(requests[0]).toContain('name="diarize"\r\n\r\ntrue');
    expect(requests[0]).toContain('segment');
    expect(text).toBe(
      '[00:00:00.100 - 00:00:00.900] Speaker 1: Budget approved.',
    );
    expect(segments).toEqual([
      {
        text: 'Budget approved.',
        start: 0.1,
        end: 0.9,
        speakerId: 'speaker_1',
      },
    ]);
  });

  it('keeps identities local to each fallback part and offsets timestamps', async () => {
    const { text, segments } = await useCase(1).execute(
      new TranscribeCommand({
        file: recording(2.5),
        fileName: 'meeting.wav',
        mimeType: 'audio/wav',
      }),
    );
    expect(requests).toHaveLength(3);
    expect(text).toContain('Part 1 / Speaker 1:');
    expect(text).toContain('[00:00:01.100 - 00:00:01.900] Part 2 / Speaker 1:');
    expect(text).toContain('Part 3 / Speaker 1:');
    expect(
      segments.map(({ speakerId, start }) => ({ speakerId, start })),
    ).toEqual([
      { speakerId: 'part-1/speaker_1', start: 0.1 },
      { speakerId: 'part-2/speaker_1', start: 1.1 },
      { speakerId: 'part-3/speaker_1', start: 2.1 },
    ]);
  });
});
