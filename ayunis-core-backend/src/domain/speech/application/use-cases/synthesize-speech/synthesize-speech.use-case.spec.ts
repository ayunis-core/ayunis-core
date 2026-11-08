import type { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { SpeechSynthesisRequest } from 'src/domain/speech/application/ports/speech.port';
import { SpeechPort } from 'src/domain/speech/application/ports/speech.port';
import { SpeechLanguageDetectorService } from 'src/domain/speech/application/services/speech-language-detector.service';
import { SpeechGenerationFailedError } from 'src/domain/speech/application/speech.errors';
import { SynthesizeSpeechCommand } from './synthesize-speech.command';
import { SynthesizeSpeechUseCase } from './synthesize-speech.use-case';

class FakeSpeechPort extends SpeechPort {
  readonly requests: SpeechSynthesisRequest[] = [];
  failure?: Error;

  synthesize(request: SpeechSynthesisRequest): Promise<AsyncIterable<Buffer>> {
    if (this.failure) return Promise.reject(this.failure);
    this.requests.push(request);
    return Promise.resolve(chunks([Buffer.from('ID3'), Buffer.from('audio')]));
  }
}

async function* chunks(buffers: Buffer[]): AsyncIterable<Buffer> {
  for (const buffer of buffers) yield buffer;
}

async function collect(audio: AsyncIterable<Buffer>): Promise<string> {
  const parts: Buffer[] = [];
  for await (const part of audio) parts.push(part);
  return Buffer.concat(parts).toString();
}

function contextWithUser(): ContextService {
  const values: Record<string, unknown> = {
    userId: '4b1c3f0e-2d4a-4b8e-9c1d-0a2b3c4d5e6f',
    orgId: '7d6e5f4a-3b2c-4d1e-8f9a-0b1c2d3e4f5a',
    role: 'user',
    systemRole: 'customer',
  };
  return { get: (key: string) => values[key] } as unknown as ContextService;
}

describe('SynthesizeSpeechUseCase', () => {
  const germanText =
    'Die Gemeinde hat beschlossen, die Öffnungszeiten des Bürgerbüros zu verlängern.';

  function command(text: string, uiLanguage: 'de' | 'en' = 'en') {
    return new SynthesizeSpeechCommand({
      text,
      uiLanguage,
      signal: new AbortController().signal,
    });
  }

  it('speaks the text in its detected language', async () => {
    const port = new FakeSpeechPort();
    const useCase = new SynthesizeSpeechUseCase(
      port,
      new SpeechLanguageDetectorService(),
      contextWithUser(),
    );

    const audio = await useCase.execute(command(germanText));

    expect(port.requests).toEqual([
      expect.objectContaining({ text: germanText, language: 'deu' }),
    ]);
    expect(await collect(audio)).toBe('ID3audio');
  });

  it('speaks short text in the UI language', async () => {
    const port = new FakeSpeechPort();
    const useCase = new SynthesizeSpeechUseCase(
      port,
      new SpeechLanguageDetectorService(),
      contextWithUser(),
    );

    await useCase.execute(command('Gerne!', 'de'));

    expect(port.requests[0].language).toBe('deu');
  });

  it('passes the abort signal on to the provider', async () => {
    const port = new FakeSpeechPort();
    const useCase = new SynthesizeSpeechUseCase(
      port,
      new SpeechLanguageDetectorService(),
      contextWithUser(),
    );
    const speechCommand = command(germanText);

    await useCase.execute(speechCommand);

    expect(port.requests[0].signal).toBe(speechCommand.signal);
  });

  it('rejects a request without a user', async () => {
    const port = new FakeSpeechPort();
    const useCase = new SynthesizeSpeechUseCase(
      port,
      new SpeechLanguageDetectorService(),
      { get: () => undefined } as unknown as ContextService,
    );

    await expect(useCase.execute(command(germanText))).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    expect(port.requests).toHaveLength(0);
  });

  it('keeps a classified provider failure', async () => {
    const port = new FakeSpeechPort();
    port.failure = new SpeechGenerationFailedError('rejected');
    const useCase = new SynthesizeSpeechUseCase(
      port,
      new SpeechLanguageDetectorService(),
      contextWithUser(),
    );

    await expect(useCase.execute(command(germanText))).rejects.toBe(
      port.failure,
    );
  });
});
