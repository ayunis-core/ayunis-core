import { describe, expect, it } from 'vitest';
import { matchSkills, readSlashToken, removeSlashToken } from './slashToken';

describe('readSlashToken', () => {
  it('reads a slash typed at the very beginning', () => {
    expect(readSlashToken('/akt', 4)).toEqual({
      start: 0,
      end: 4,
      query: 'akt',
    });
  });

  it('reads a slash that follows a space', () => {
    expect(readSlashToken('bitte /akt', 10)).toEqual({
      start: 6,
      end: 10,
      query: 'akt',
    });
  });

  it('ignores a slash inside a word', () => {
    expect(readSlashToken('ordner/akte', 11)).toBeNull();
  });

  it('closes again once the word is finished', () => {
    expect(readSlashToken('/akte weiter', 12)).toBeNull();
  });

  it('ignores a slash that lies behind the caret', () => {
    expect(readSlashToken('hallo /akte', 5)).toBeNull();
  });

  it('opens on the bare slash', () => {
    expect(readSlashToken('/', 1)).toEqual({ start: 0, end: 1, query: '' });
  });
});

describe('removeSlashToken', () => {
  it('cuts the typed token back out of the message', () => {
    const value = 'bitte /akt prüfen';
    const token = readSlashToken(value, 10);
    expect(token && removeSlashToken(value, token)).toBe('bitte  prüfen');
  });
});

describe('matchSkills', () => {
  const skills = [{ name: 'Aktenplan' }, { name: 'Fristenprüfung' }];

  it('returns everything for the bare slash', () => {
    expect(matchSkills(skills, '')).toHaveLength(2);
  });

  it('matches anywhere in the name, ignoring case', () => {
    expect(matchSkills(skills, 'PRÜF')).toEqual([{ name: 'Fristenprüfung' }]);
  });
});
