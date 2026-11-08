import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { ProviderServerError } from 'src/common/errors/provider.errors';
import { SpeechGenerationFailedError } from 'src/domain/speech/application/speech.errors';
import type { SpeechLanguage } from 'src/domain/speech/domain/speech-language';
import { MistralSpeechService } from './mistral-speech.service';

jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    audio: { speech: { complete: jest.fn() } },
  })),
}));

jest.mock('src/common/util/retryWithBackoff', () => ({
  __esModule: true,
  default: ({ fn }: { fn: () => Promise<unknown> }) => fn(),
}));

function mistralError(statusCode: number, body: string): MistralError {
  const response = {
    status: statusCode,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'https://api.mistral.ai/v1/audio/speech',
  } as unknown as Response;
  return new MistralError(`API error: ${statusCode}`, {
    response,
    request: {} as Request,
    body,
  });
}

function delta(text: string) {
  return {
    event: 'speech.audio.delta',
    data: {
      type: 'speech.audio.delta',
      audioData: Buffer.from(text).toString('base64'),
    },
  };
}

const DONE = {
  event: 'speech.audio.done',
  data: { type: 'speech.audio.done', usage: {} },
};

async function* events(items: unknown[], failure?: Error) {
  for (const item of items) yield item;
  if (failure) throw failure;
}

async function collect(audio: AsyncIterable<Buffer>): Promise<string> {
  const parts: Buffer[] = [];
  for await (const part of audio) parts.push(part);
  return Buffer.concat(parts).toString();
}

describe('MistralSpeechService', () => {
  let complete: jest.Mock;

  async function createService(config: Record<string, string | undefined>) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MistralSpeechService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: string) =>
                config[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();

    const service = module.get(MistralSpeechService);
    complete = (
      service as unknown as {
        client: { audio: { speech: { complete: jest.Mock } } };
      }
    ).client.audio.speech.complete;
    return service;
  }

  function request(language: SpeechLanguage = 'deu') {
    return {
      text: 'Guten Tag.',
      language,
      signal: new AbortController().signal,
    };
  }

  it('streams the decoded MP3 chunks of the speech', async () => {
    const service = await createService({});
    complete.mockResolvedValue(events([delta('ID3'), delta('frames'), DONE]));

    const audio = await service.synthesize(request());

    expect(await collect(audio)).toBe('ID3frames');
    expect(complete).toHaveBeenCalledWith(
      {
        model: 'voxtral-mini-tts-3-0',
        input: 'Guten Tag.',
        voiceId: 'voice_481',
        responseFormat: 'mp3',
        stream: true,
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('uses the configured speech model', async () => {
    const service = await createService({
      'models.mistral.ttsModel': 'voxtral-mini-tts-latest',
    });
    complete.mockResolvedValue(events([DONE]));

    await service.synthesize(request());

    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'voxtral-mini-tts-latest' }),
      expect.anything(),
    );
  });

  it.each<[SpeechLanguage, string]>([
    ['arb', 'voice_479'],
    ['cat', 'voice_3143'],
    ['cmn', 'voice_3142'],
    ['nld', 'voice_3145'],
    ['eng', 'voice_447'],
    ['fra', 'voice_592'],
    ['deu', 'voice_481'],
    ['hin', 'voice_3139'],
    ['hun', 'voice_3146'],
    ['ita', 'voice_482'],
    ['jpn', 'voice_3133'],
    ['kor', 'voice_3136'],
    ['nob', 'voice_3134'],
    ['pol', 'voice_3154'],
    ['por', 'voice_480'],
    ['ron', 'voice_3155'],
    ['rus', 'voice_3132'],
    ['spa', 'voice_483'],
    ['tur', 'voice_3138'],
    ['ukr', 'voice_3140'],
    ['vie', 'voice_3144'],
  ])('reads %s with the preset voice %s', async (language, voiceId) => {
    const service = await createService({});
    complete.mockResolvedValue(events([DONE]));

    await service.synthesize(request(language));

    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ voiceId }),
      expect.anything(),
    );
  });

  it('stops the provider request when the caller aborts', async () => {
    const service = await createService({});
    complete.mockResolvedValue(events([DONE]));
    const controller = new AbortController();

    await service.synthesize({ ...request(), signal: controller.signal });
    controller.abort();

    const [, options] = complete.mock.calls[0] as [
      unknown,
      { signal: AbortSignal },
    ];
    expect(options.signal.aborted).toBe(true);
  });

  it('ends the audio quietly when the caller aborts mid-stream', async () => {
    const service = await createService({});
    const controller = new AbortController();
    complete.mockResolvedValue(
      events([delta('ID3')], new DOMException('aborted', 'AbortError')),
    );

    const audio = await service.synthesize({
      ...request(),
      signal: controller.signal,
    });
    controller.abort();

    expect(await collect(audio)).toBe('ID3');
  });

  it('returns no audio when the caller aborts before the provider answers', async () => {
    const service = await createService({});
    const controller = new AbortController();
    complete.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException('aborted', 'AbortError'));
    });

    const audio = await service.synthesize({
      ...request(),
      signal: controller.signal,
    });

    expect(await collect(audio)).toBe('');
  });

  it('classifies an upstream server error as provider unavailability', async () => {
    const service = await createService({});
    complete.mockRejectedValue(mistralError(503, '{"message":"busy"}'));

    await expect(service.synthesize(request())).rejects.toBeInstanceOf(
      ProviderServerError,
    );
  });

  it('reports a rejected request as a failed generation', async () => {
    const service = await createService({});
    complete.mockRejectedValue(
      mistralError(404, '{"message":"Voice not found.","code":"1902"}'),
    );

    await expect(service.synthesize(request())).rejects.toBeInstanceOf(
      SpeechGenerationFailedError,
    );
  });

  it('reports a stream that breaks off as a failed generation', async () => {
    const service = await createService({});
    complete.mockResolvedValue(
      events([delta('ID3')], new Error('stream parse failure')),
    );

    const audio = await service.synthesize(request());

    await expect(collect(audio)).rejects.toBeInstanceOf(
      SpeechGenerationFailedError,
    );
  });
});
