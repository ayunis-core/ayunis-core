import { describe, it, expect } from 'vitest';
import { modelSettingsSearchSchema } from './search';

describe('modelSettingsSearchSchema', () => {
  it('fills both params when the URL carries no search', () => {
    expect(modelSettingsSearchSchema.parse({})).toEqual({
      tab: 'organization',
      search: '',
    });
  });

  it('keeps valid params', () => {
    expect(
      modelSettingsSearchSchema.parse({ tab: 'teams', search: 'gpt' }),
    ).toEqual({ tab: 'teams', search: 'gpt' });
  });

  it('falls back when a param is invalid', () => {
    expect(modelSettingsSearchSchema.parse({ tab: 'bogus' })).toEqual({
      tab: 'organization',
      search: '',
    });
  });
});
