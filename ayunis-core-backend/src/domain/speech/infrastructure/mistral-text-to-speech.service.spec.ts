import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SDKError } from '@mistralai/mistralai/models/errors';
import { MistralTextToSpeechService } from './mistral-text-to-speech.service';
import {
  SpeechServiceUnavailableError,
  SpeechSynthesisFailedError,
} from '../application/speech.errors';

// Mock the Mistral SDK
jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    audio: {
      speech: {
        complete: jest.fn(),
      },
    },
  })),
}));

// Mock retryWithBackoff to execute fn directly (no retries in tests)
jest.mock('src/common/util/retryWithBackoff', () => ({
  __esModule: true,
  default: ({ fn }: { fn: () => Promise<unknown> }) => fn(),
}));

function createSdkError(statusCode: number): SDKError {
  const response = {
    status: statusCode,
    headers: new Headers({ 'content-type': 'application/json' }),
  } as unknown as Response;
  return new SDKError(`API error: ${statusCode}`, {
    response,
    request: {} as Request,
    body: '{}',
  });
}

describe('MistralTextToSpeechService', () => {
  let mockClient: {
    audio: { speech: { complete: jest.Mock } };
  };

  const speechAudio = Buffer.from('fake mp3 audio bytes');

  async function createService(config: Record<string, string | undefined>) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MistralTextToSpeechService,
        {
          provide: ConfigService,
          useValue: {
            // Mirror ConfigService.get(key, default) fallback behavior
            get: jest.fn(
              (key: string, defaultValue?: string) =>
                config[key] ?? defaultValue,
            ),
          },
        },
      ],
    }).compile();

    const service = module.get(MistralTextToSpeechService);
    mockClient = (service as unknown as { client: typeof mockClient }).client;
    mockClient.audio.speech.complete.mockResolvedValue({
      audioData: speechAudio.toString('base64'),
    });
    return service;
  }

  it('should request the configured TTS model and voice with mp3 output', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.ttsModel': 'voxtral-mini-tts-2603',
      'models.mistral.ttsVoice': 'aurora',
    });

    await service.synthesize('Ihr Antrag wurde genehmigt.');

    expect(mockClient.audio.speech.complete).toHaveBeenCalledWith({
      model: 'voxtral-mini-tts-2603',
      voiceId: 'aurora',
      input: 'Ihr Antrag wurde genehmigt.',
      responseFormat: 'mp3',
      stream: false,
    });
  });

  it('should fall back to the default voice when none is configured', async () => {
    // Mistral rejects speech requests without a voice, so the service must
    // always send one
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.ttsModel': 'voxtral-mini-tts-latest',
    });

    await service.synthesize('Guten Tag.');

    const request = mockClient.audio.speech.complete.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(request.voiceId).toBe('en_paul_neutral');
  });

  it('should decode the base64 audio payload into a Buffer', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.ttsModel': 'voxtral-mini-tts-latest',
    });

    const result = await service.synthesize('Guten Tag.');

    expect(result).toEqual(speechAudio);
  });

  it('should map 5xx SDK errors to SpeechServiceUnavailableError', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.ttsModel': 'voxtral-mini-tts-latest',
    });
    mockClient.audio.speech.complete.mockRejectedValue(createSdkError(503));

    await expect(service.synthesize('Guten Tag.')).rejects.toThrow(
      SpeechServiceUnavailableError,
    );
  });

  it('should wrap non-transient errors in SpeechSynthesisFailedError', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.ttsModel': 'voxtral-mini-tts-latest',
    });
    mockClient.audio.speech.complete.mockRejectedValue(createSdkError(422));

    await expect(service.synthesize('Guten Tag.')).rejects.toThrow(
      SpeechSynthesisFailedError,
    );
  });
});
