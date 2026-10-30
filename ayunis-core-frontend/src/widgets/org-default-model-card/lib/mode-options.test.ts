import { describe, expect, it } from 'vitest';
import { modeOptionsForLevel } from './mode-options';

const model = {
  id: 'permit-large',
  name: 'mistral-large',
  provider: 'mistral',
  displayName: 'Mistral Large',
} as const;
const modes = (options: ReturnType<typeof modeOptionsForLevel>) =>
  options.map((o) => o.mode);

describe(modeOptionsForLevel.name, () => {
  it('offers no mode while none resolves on this level', () => {
    expect(modeOptionsForLevel([], null, undefined)).toEqual([]);
  });

  it('offers only the modes that resolve on this level', () => {
    expect(modes(modeOptionsForLevel(['auto'], null, undefined))).toEqual([
      'auto',
    ]);
  });

  it('keeps a saved mode selectable after it stops resolving', () => {
    expect(modes(modeOptionsForLevel([], 'max', undefined))).toEqual(['max']);
  });

  it('attaches the current model to the saved mode only', () => {
    const options = modeOptionsForLevel(['auto', 'max'], 'max', model);
    expect(options).toEqual([
      { mode: 'auto', resolvedModel: undefined },
      { mode: 'max', resolvedModel: model },
    ]);
  });
});
