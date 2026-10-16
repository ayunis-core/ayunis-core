import { describe, expect, it } from 'vitest';
import {
  orgEditorsCopy,
  ownerOptionValue,
  teamEditorsCopy,
  toOwnerChoice,
} from './owner-copy';

const jonas = { userId: 'jonas', name: 'Jonas Weber' };
const aylin = { userId: 'aylin', name: 'Aylin Demir' };

describe('teamEditorsCopy', () => {
  it('names the viewer with the other team admins', () => {
    expect(teamEditorsCopy([jonas, aylin], 'jonas')).toEqual({
      key: 'editors.youAndOthers',
    });
  });

  it('names the viewer as the only team admin', () => {
    expect(teamEditorsCopy([jonas], 'jonas')).toEqual({
      key: 'editors.youOnly',
    });
  });

  it('names the single other team admin', () => {
    expect(teamEditorsCopy([jonas], 'lena')).toEqual({
      key: 'editors.one',
      values: { name: 'Jonas Weber' },
    });
  });

  it('falls back to the team admins or to admins', () => {
    expect(teamEditorsCopy([jonas, aylin], 'lena').key).toBe(
      'editors.teamAdmins',
    );
    expect(teamEditorsCopy([], 'lena').key).toBe('editors.adminsOnly');
  });
});

describe('orgEditorsCopy', () => {
  it('mentions the right only when non-admin roles hold it', () => {
    expect(orgEditorsCopy(true).key).toBe('editors.orgWithRight');
    expect(orgEditorsCopy(false).key).toBe('editors.adminsOnly');
  });
});

describe('owner options', () => {
  it('maps options to stable values and create payloads', () => {
    const team = { type: 'team' as const, teamId: 't1', teamName: 'Bauamt' };
    expect(ownerOptionValue(team)).toBe('team:t1');
    expect(toOwnerChoice(team)).toEqual({ ownerType: 'team', teamId: 't1' });
    expect(toOwnerChoice({ type: 'org' })).toEqual({ ownerType: 'org' });
    expect(toOwnerChoice({ type: 'personal' })).toEqual({
      ownerType: 'personal',
    });
  });
});
