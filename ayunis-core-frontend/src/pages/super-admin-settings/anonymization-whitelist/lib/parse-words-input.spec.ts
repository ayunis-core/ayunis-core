import { describe, expect, it } from 'vitest';
import { parseWordsInput } from './parse-words-input';

describe('parseWordsInput', () => {
  it('splits on commas only, keeping spaces inside a word', () => {
    expect(parseWordsInput('Test 1, Test2')).toEqual(['Test 1', 'Test2']);
  });

  it('trims surrounding whitespace and drops empty segments', () => {
    expect(parseWordsInput(' Mitarbeitende ,,\n Bürgeramt , ')).toEqual([
      'Mitarbeitende',
      'Bürgeramt',
    ]);
  });

  it('keeps the first casing of words repeated in the same input', () => {
    expect(parseWordsInput('Wir, wir, Uns')).toEqual(['Wir', 'Uns']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseWordsInput('  ,  ')).toEqual([]);
  });
});
