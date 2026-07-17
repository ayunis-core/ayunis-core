import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
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
