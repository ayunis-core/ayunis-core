import { createMaskRegistry } from 'src/common/anonymization/domain/apply-mask-replacements';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import {
  alignEdit,
  findKnownValues,
  PLAIN_VALUES,
  replaceWithPlaceholders,
  type AlignedEdit,
} from './user-edit-placeholders';

const dictionary: PiiMask[] = [
  { category: PiiCategory.PERSON_NAME, maskIndex: 1, value: 'Anna' },
  { category: PiiCategory.PERSON_NAME, maskIndex: 2, value: 'Max Mustermann' },
  { category: PiiCategory.ORGANIZATION, maskIndex: 1, value: 'Müller & Söhne' },
];

const changedText = (edit: AlignedEdit) =>
  edit.changed.map(({ start, end }) => edit.text.slice(start, end));

const withKnownValues = (edit: AlignedEdit) =>
  replaceWithPlaceholders(
    edit.text,
    findKnownValues(edit, dictionary, PLAIN_VALUES),
    createMaskRegistry(dictionary),
  );

describe('alignEdit', () => {
  it('treats a value the user changed in part as changed text, so it is masked anew', async () => {
    const stored = '<p>An {{pii:PERSON_NAME_2}}</p>';

    const edit = await alignEdit(
      stored,
      '<p>An Max Musterfrau</p>',
      dictionary,
      PLAIN_VALUES,
    );

    expect(edit.text).toBe('<p>An Max Musterfrau</p>');
    expect(changedText(edit)).toEqual(['Max Musterfrau']);
  });

  it('keeps unknown placeholders as they are stored', async () => {
    const stored = '<p>{{pii:PERSON_NAME_9}} und {{pii:PERSON_NAME_1}}</p>';

    const edit = await alignEdit(
      stored,
      '<p>{{pii:PERSON_NAME_9}} und Anna!</p>',
      dictionary,
      PLAIN_VALUES,
    );

    expect(edit.text).toBe(
      '<p>{{pii:PERSON_NAME_9}} und {{pii:PERSON_NAME_1}}!</p>',
    );
  });
});

describe('findKnownValues', () => {
  it('gives a known value typed into changed text its placeholder, but not a word that merely contains it', async () => {
    const edit = await alignEdit(
      '<p>Text</p>',
      '<p>Text</p><p>Anna und Max Mustermann zur Annahme</p>',
      dictionary,
      PLAIN_VALUES,
    );

    expect(withKnownValues(edit)).toBe(
      '<p>Text</p><p>{{pii:PERSON_NAME_1}} und {{pii:PERSON_NAME_2}} zur Annahme</p>',
    );
  });

  it('leaves known values in unchanged text alone, as they were stored', async () => {
    const stored = '<p>Anna</p>';

    const edit = await alignEdit(
      stored,
      '<p>Anna</p><p>neu</p>',
      dictionary,
      PLAIN_VALUES,
    );

    expect(withKnownValues(edit)).toBe('<p>Anna</p><p>neu</p>');
  });
});
