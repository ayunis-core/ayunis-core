import {
  createPiiTokenTranslator,
  findReferencedMasks,
} from './translate-pii-tokens';
import { PiiCategory } from './pii-category.enum';
import type { PiiMask } from './pii-mask';

const person = (maskIndex: number, value: string): PiiMask => ({
  category: PiiCategory.PERSON_NAME,
  maskIndex,
  value,
});

describe('createPiiTokenTranslator', () => {
  const artifactDictionary = [person(1, 'Anna Schmidt')];

  it('reads an artifact placeholder as the chat’s placeholder for the same value', () => {
    const chatDictionary = [
      person(1, 'Bernd Bauer'),
      person(2, 'Carla Weber'),
      person(3, 'Anna Schmidt'),
    ];
    const translator = createPiiTokenTranslator(
      artifactDictionary,
      chatDictionary,
    );

    expect(
      translator.translate('<p>Sehr geehrte {{pii:PERSON_NAME_1}}</p>'),
    ).toBe('<p>Sehr geehrte {{pii:PERSON_NAME_3}}</p>');
    expect(translator.newMasks).toEqual([]);
  });

  it('gives a value the chat does not know the next free placeholder of its category', () => {
    const chatDictionary = [person(1, 'Bernd Bauer'), person(2, 'Carla Weber')];
    const translator = createPiiTokenTranslator(
      artifactDictionary,
      chatDictionary,
    );

    expect(translator.translate('{{pii:PERSON_NAME_1}}')).toBe(
      '{{pii:PERSON_NAME_3}}',
    );
    expect(translator.newMasks).toEqual([person(3, 'Anna Schmidt')]);
  });

  it('writes a chat placeholder back as the artifact’s placeholder for the same value', () => {
    const chatDictionary = [
      person(1, 'Bernd Bauer'),
      person(3, 'Anna Schmidt'),
    ];
    const translator = createPiiTokenTranslator(
      chatDictionary,
      artifactDictionary,
    );

    expect(
      translator.translate('{{pii:PERSON_NAME_3}} und {{pii:PERSON_NAME_1}}'),
    ).toBe('{{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}}');
    expect(translator.newMasks).toEqual([person(2, 'Bernd Bauer')]);
  });

  it('reports a placeholder the source does not know and leaves it as it is', () => {
    const translator = createPiiTokenTranslator(artifactDictionary, []);

    expect(translator.translate('{{pii:PERSON_NAME_7}}')).toBe(
      '{{pii:PERSON_NAME_7}}',
    );
    expect([...translator.unknownTokens]).toEqual(['{{pii:PERSON_NAME_7}}']);
    expect(translator.newMasks).toEqual([]);
  });

  it('keeps one value in two categories apart', () => {
    const source: PiiMask[] = [
      { category: PiiCategory.LOCATION, maskIndex: 4, value: 'Siegburg' },
      { category: PiiCategory.ORGANIZATION, maskIndex: 2, value: 'Siegburg' },
    ];
    const translator = createPiiTokenTranslator(source, []);

    expect(
      translator.translate('{{pii:LOCATION_4}} / {{pii:ORGANIZATION_2}}'),
    ).toBe('{{pii:LOCATION_1}} / {{pii:ORGANIZATION_1}}');
  });

  it('allocates a value once across several texts', () => {
    const chatDictionary = [person(5, 'Anna Schmidt')];
    const translator = createPiiTokenTranslator(chatDictionary, []);

    translator.translate('{{pii:PERSON_NAME_5}}');
    translator.translate('{{pii:PERSON_NAME_5}}');

    expect(translator.newMasks).toEqual([person(1, 'Anna Schmidt')]);
  });
});

describe('findReferencedMasks', () => {
  it('returns each dictionary entry whose token occurs, once, and ignores unknown tokens', () => {
    const dictionary = [person(1, 'Anna Schmidt'), person(2, 'Bernd Bauer')];

    expect(
      findReferencedMasks(
        [
          '{{pii:PERSON_NAME_2}} {{pii:PERSON_NAME_9}}',
          '{{pii:PERSON_NAME_2}}',
        ],
        dictionary,
      ),
    ).toEqual([person(2, 'Bernd Bauer')]);
  });
});
