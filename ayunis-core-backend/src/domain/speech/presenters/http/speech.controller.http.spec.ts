import type { INestApplication } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { featuresConfig } from 'src/config/features.config';
import type { SpeechSynthesisRequest } from 'src/domain/speech/application/ports/speech.port';
import { SpeechPort } from 'src/domain/speech/application/ports/speech.port';
import { SpeechLanguageDetectorService } from 'src/domain/speech/application/services/speech-language-detector.service';
import { SpeechGenerationFailedError } from 'src/domain/speech/application/speech.errors';
import { SynthesizeSpeechUseCase } from 'src/domain/speech/application/use-cases/synthesize-speech/synthesize-speech.use-case';
import { SpeechController } from './speech.controller';

class FakeSpeechPort extends SpeechPort {
  readonly requests: SpeechSynthesisRequest[] = [];
  audio: () => AsyncIterable<Buffer> = () => chunks(['ID3', 'frames']);
  failure?: Error;

  synthesize(request: SpeechSynthesisRequest): Promise<AsyncIterable<Buffer>> {
    this.requests.push(request);
    if (this.failure) return Promise.reject(this.failure);
    return Promise.resolve(this.audio());
  }
}

async function* chunks(parts: string[]): AsyncIterable<Buffer> {
  for (const part of parts) yield Buffer.from(part);
}

const USER_CONTEXT: Record<string, string> = {
  userId: '4b1c3f0e-2d4a-4b8e-9c1d-0a2b3c4d5e6f',
  orgId: '7d6e5f4a-3b2c-4d1e-8f9a-0b1c2d3e4f5a',
  role: 'user',
  systemRole: 'customer',
};

async function startApp(
  env: { mistralApiKey?: string; readAloudFlag?: string },
  port: FakeSpeechPort,
): Promise<{ app: INestApplication; baseUrl: string }> {
  const original = process.env;
  process.env = { ...original };
  delete process.env.MISTRAL_API_KEY;
  delete process.env.FEATURE_READ_ALOUD_ENABLED;
  if (env.mistralApiKey !== undefined) {
    process.env.MISTRAL_API_KEY = env.mistralApiKey;
  }
  if (env.readAloudFlag !== undefined) {
    process.env.FEATURE_READ_ALOUD_ENABLED = env.readAloudFlag;
  }
  try {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [featuresConfig],
        }),
      ],
      controllers: [SpeechController],
      providers: [
        SynthesizeSpeechUseCase,
        SpeechLanguageDetectorService,
        { provide: SpeechPort, useValue: port },
        {
          provide: ContextService,
          useValue: { get: (key: string) => USER_CONTEXT[key] },
        },
        { provide: APP_FILTER, useClass: ApplicationErrorFilter },
      ],
    }).compile();
    const app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: () => new BadRequestException('Validation failed'),
      }),
    );
    await app.listen(0, '127.0.0.1');
    return { app, baseUrl: await app.getUrl() };
  } finally {
    process.env = original;
  }
}

function postSpeech(baseUrl: string, body: unknown, signal?: AbortSignal) {
  return fetch(`${baseUrl}/speech`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

async function waitUntil(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !condition(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const GERMAN_TEXT =
  'Die Gemeinde hat beschlossen, die Öffnungszeiten des Bürgerbüros zu verlängern.';

describe('POST /speech', () => {
  describe('with read aloud enabled and a Mistral API key', () => {
    let app: INestApplication;
    let baseUrl: string;
    let port: FakeSpeechPort;

    beforeEach(async () => {
      port = new FakeSpeechPort();
      ({ app, baseUrl } = await startApp(
        { mistralApiKey: 'mistral-key', readAloudFlag: 'true' },
        port,
      ));
    });

    afterEach(async () => {
      await app.close();
    });

    it('streams the speech as MP3', async () => {
      const response = await postSpeech(baseUrl, {
        text: GERMAN_TEXT,
        language: 'en',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('audio/mpeg');
      expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
        'ID3frames',
      );
      expect(port.requests[0]).toMatchObject({
        text: GERMAN_TEXT,
        language: 'deu',
      });
    });

    it('sends the first chunk before generation finishes', async () => {
      let finishGeneration = () => {};
      const generationFinished = new Promise<void>((resolve) => {
        finishGeneration = resolve;
      });
      port.audio = async function* () {
        yield Buffer.from('ID3');
        await generationFinished;
        yield Buffer.from('frames');
      };

      const response = await postSpeech(baseUrl, { text: GERMAN_TEXT });
      const reader = response.body!.getReader();
      const first = await reader.read();
      finishGeneration();

      expect(Buffer.from(first.value!).toString()).toBe('ID3');
      await reader.cancel();
    });

    it('rejects empty text before calling the provider', async () => {
      const response = await postSpeech(baseUrl, { text: '  ' });

      expect(response.status).toBe(400);
      expect(port.requests).toHaveLength(0);
    });

    it('answers a provider failure before the first chunk with its error', async () => {
      port.failure = new SpeechGenerationFailedError('rejected');

      const response = await postSpeech(baseUrl, { text: GERMAN_TEXT });

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({
        code: 'SPEECH_GENERATION_FAILED',
      });
    });

    it('breaks the response off when generation fails mid-stream', async () => {
      port.audio = async function* () {
        yield Buffer.from('ID3');
        await Promise.resolve();
        throw new SpeechGenerationFailedError('broke off');
      };

      const response = await postSpeech(baseUrl, { text: GERMAN_TEXT });

      expect(response.status).toBe(200);
      await expect(response.arrayBuffer()).rejects.toThrow();
    });

    it('aborts generation when the listener disconnects', async () => {
      port.audio = async function* () {
        yield Buffer.from('ID3');
        await new Promise(() => {});
      };
      const controller = new AbortController();

      const response = await postSpeech(
        baseUrl,
        { text: GERMAN_TEXT },
        controller.signal,
      );
      await response.body!.getReader().read();
      controller.abort();

      await waitUntil(() => port.requests[0].signal.aborted);
      expect(port.requests[0].signal.aborted).toBe(true);
    });
  });

  describe.each([
    ['without a Mistral API key', { readAloudFlag: 'true' }],
    [
      'with read aloud left off',
      { mistralApiKey: 'mistral-key', readAloudFlag: undefined },
    ],
  ])('%s', (_case, env) => {
    it('is not available', async () => {
      const port = new FakeSpeechPort();
      const { app, baseUrl } = await startApp(env, port);
      try {
        const response = await postSpeech(baseUrl, { text: GERMAN_TEXT });

        expect(response.status).toBe(404);
        expect(port.requests).toHaveLength(0);
      } finally {
        await app.close();
      }
    });
  });
});
