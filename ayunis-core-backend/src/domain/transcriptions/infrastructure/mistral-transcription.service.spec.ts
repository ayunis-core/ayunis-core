import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MistralError } from '@mistralai/mistralai/models/errors';
import { MistralTranscriptionService } from './mistral-transcription.service';

// Mock the Mistral SDK
jest.mock('@mistralai/mistralai', () => ({
  Mistral: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
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

function createMistralError(statusCode: number, body: string): MistralError {
  const response = {
    status: statusCode,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'https://api.mistral.ai/v1/audio/transcriptions',
  } as unknown as Response;
  const request = {} as Request;
  return new MistralError(`API error: ${statusCode}`, {
    response,
    request,
    body,
  });
}

describe('MistralTranscriptionService', () => {
  let mockClient: {
    audio: { transcriptions: { complete: jest.Mock } };
  };

  async function createService(config: Record<string, string | undefined>) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MistralTranscriptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => config[key]),
          },
        },
      ],
    }).compile();

    const service = module.get(MistralTranscriptionService);
    mockClient = (service as unknown as { client: typeof mockClient }).client;
    mockClient.audio.transcriptions.complete.mockResolvedValue({
      text: 'Guten Tag, hiermit beantrage ich eine Meldebescheinigung.',
    });
    return service;
  }

  it('should send the transcription model configured via models.mistral.transcriptionModel', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });

    await service.transcribe(
      Buffer.from('fake audio content'),
      'buergeranfrage.mp3',
      'audio/mpeg',
    );

    expect(mockClient.audio.transcriptions.complete).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'voxtral-mini-2602' }),
    );
  });

  it('maps Mistral undecodable audio rejection to an invalid audio error', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });
    mockClient.audio.transcriptions.complete.mockRejectedValue(
      createMistralError(
        400,
        '{"object":"error","message":"Audio input could not be decoded. ","type":"invalid_request_file","param":null,"code":"3310","raw_status_code":400}',
      ),
    );

    await expect(
      service.transcribe(
        Buffer.from('undecodable audio content'),
        'defekte-aufnahme.webm',
        'audio/webm',
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_AUDIO_FILE',
      statusCode: 400,
      message: 'Invalid audio file',
    });
  });

  it.each([
    [
      'different error type',
      '{"message":"Audio input could not be decoded. ","type":"invalid_audio","code":"3310"}',
    ],
    [
      'different error code',
      '{"message":"Audio input could not be decoded. ","type":"invalid_request_file","code":"3320"}',
    ],
    [
      'different message',
      '{"message":"Audio duration exceeds the supported limit","type":"invalid_request_file","code":"3310"}',
    ],
    [
      'malformed response body',
      '{"message":"Audio input could not be decoded"',
    ],
  ])('keeps %s as a generic transcription failure', async (_case, body) => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });
    mockClient.audio.transcriptions.complete.mockRejectedValue(
      createMistralError(400, body),
    );

    await expect(
      service.transcribe(
        Buffer.from('rejected audio content'),
        'abgelehnte-aufnahme.webm',
        'audio/webm',
      ),
    ).rejects.toMatchObject({
      code: 'TRANSCRIPTION_FAILED',
      statusCode: 500,
    });
  });

  // A dropped TLS connection must group under the stable provider taxonomy
  // instead of a hand-rolled availability guess; the retry predicate itself
  // is covered by mistral-transient-error.spec (AYC-653).
  it('classifies transport failures under the provider taxonomy', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });
    mockClient.audio.transcriptions.complete.mockRejectedValue(
      Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
    );

    await expect(
      service.transcribe(
        Buffer.from('fake audio content'),
        'buergeranfrage.mp3',
        'audio/mpeg',
      ),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_CONNECTION_MISTRAL',
    });
  });

  it('classifies Mistral server failures under the provider taxonomy', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });
    mockClient.audio.transcriptions.complete.mockRejectedValue(
      createMistralError(503, '{"message":"Service unavailable"}'),
    );

    await expect(
      service.transcribe(
        Buffer.from('valid audio content'),
        'buergeranfrage.mp3',
        'audio/mpeg',
      ),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE_SERVER_MISTRAL',
    });
  });

  it('keeps Mistral authentication rejections as transcription failures', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'invalid-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-2602',
    });
    mockClient.audio.transcriptions.complete.mockRejectedValue(
      createMistralError(401, '{"message":"Unauthorized"}'),
    );

    await expect(
      service.transcribe(
        Buffer.from('valid audio content'),
        'buergeranfrage.mp3',
        'audio/mpeg',
      ),
    ).rejects.toMatchObject({
      code: 'TRANSCRIPTION_FAILED',
      statusCode: 500,
    });
  });

  it('should return the trimmed transcription text', async () => {
    const service = await createService({
      'models.mistral.apiKey': 'test-api-key',
      'models.mistral.transcriptionModel': 'voxtral-mini-latest',
    });
    mockClient.audio.transcriptions.complete.mockResolvedValue({
      text: '  Sehr geehrte Damen und Herren  ',
    });

    const result = await service.transcribe(
      Buffer.from('fake audio content'),
      'anruf.wav',
      'audio/wav',
    );

    expect(result).toBe('Sehr geehrte Damen und Herren');
  });
});
