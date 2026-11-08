import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_SPEECH_TEXT_LENGTH,
  SynthesizeSpeechDto,
} from './synthesize-speech.dto';

async function errorsFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(SynthesizeSpeechDto, body));
  return errors.map((error) => error.property);
}

describe('SynthesizeSpeechDto', () => {
  it.each(['en', 'de', undefined])(
    'accepts text with the UI language %p',
    async (language) => {
      expect(await errorsFor({ text: 'Guten Tag.', language })).toEqual([]);
    },
  );

  it.each(['', '   \n', undefined, 42])('rejects the text %p', async (text) => {
    expect(await errorsFor({ text })).toEqual(['text']);
  });

  it('rejects text longer than the limit', async () => {
    expect(
      await errorsFor({ text: 'a'.repeat(MAX_SPEECH_TEXT_LENGTH + 1) }),
    ).toEqual(['text']);
  });

  it.each(['fr', 'German', ''])(
    'rejects the UI language %p',
    async (language) => {
      expect(await errorsFor({ text: 'Hallo', language })).toEqual([
        'language',
      ]);
    },
  );
});
