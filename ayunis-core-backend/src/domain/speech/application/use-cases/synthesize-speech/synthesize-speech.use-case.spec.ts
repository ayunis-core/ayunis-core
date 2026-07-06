import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { SynthesizeSpeechUseCase } from './synthesize-speech.use-case';
import { SynthesizeSpeechCommand } from './synthesize-speech.command';
import { TextToSpeechPort } from '../../ports/text-to-speech.port';
import { InvalidSpeechInputError } from '../../speech.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('SynthesizeSpeechUseCase', () => {
  let useCase: SynthesizeSpeechUseCase;
  let synthesize: jest.Mock;
  let getContext: jest.Mock;

  const speechAudio = Buffer.from('fake mp3 audio bytes');

  beforeEach(async () => {
    synthesize = jest.fn().mockResolvedValue(speechAudio);
    getContext = jest.fn().mockReturnValue('a2c5e9d1-user-id');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesizeSpeechUseCase,
        { provide: TextToSpeechPort, useValue: { synthesize } },
        { provide: ContextService, useValue: { get: getContext } },
      ],
    }).compile();

    useCase = module.get(SynthesizeSpeechUseCase);
  });

  it('should return the synthesized audio for valid input', async () => {
    const result = await useCase.execute(
      new SynthesizeSpeechCommand({ input: 'Ihr Antrag wurde genehmigt.' }),
    );

    expect(result).toEqual(speechAudio);
    expect(synthesize).toHaveBeenCalledWith('Ihr Antrag wurde genehmigt.');
  });

  it('should reject when no user is in the request context', async () => {
    getContext.mockReturnValue(undefined);

    await expect(
      useCase.execute(new SynthesizeSpeechCommand({ input: 'Guten Tag.' })),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('should reject empty or whitespace-only input', async () => {
    await expect(
      useCase.execute(new SynthesizeSpeechCommand({ input: '   \n ' })),
    ).rejects.toThrow(InvalidSpeechInputError);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('should reject input longer than 5000 characters', async () => {
    const longInput = 'a'.repeat(5001);

    await expect(
      useCase.execute(new SynthesizeSpeechCommand({ input: longInput })),
    ).rejects.toThrow(InvalidSpeechInputError);
    expect(synthesize).not.toHaveBeenCalled();
  });
});
