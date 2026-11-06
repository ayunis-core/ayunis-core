import { describe, expect, it } from 'vitest';
import { modeOptionsForLevel, unavailableModesHint } from './mode-options';

const model = {
  id: 'permit-large',
  name: 'mistral-large',
  provider: 'mistral',
  displayName: 'Mistral Large',
} as const;
const disabledModes = (options: ReturnType<typeof modeOptionsForLevel>) =>
  options.filter((o) => o.disabled).map((o) => o.mode);

describe(modeOptionsForLevel.name, () => {
  it('lists every mode greyed out while none resolves on this level', () => {
    expect(disabledModes(modeOptionsForLevel([], null, undefined))).toEqual([
      'auto',
      'max',
    ]);
  });

  it('greys out only the modes that do not resolve on this level', () => {
    expect(
      disabledModes(modeOptionsForLevel(['auto'], null, undefined)),
    ).toEqual(['max']);
  });

  it('attaches the current model to the saved mode only', () => {
    const options = modeOptionsForLevel(['auto', 'max'], 'max', model);
    expect(options).toEqual([
      { mode: 'auto', resolvedModel: undefined, disabled: false },
      { mode: 'max', resolvedModel: model, disabled: false },
    ]);
  });
});

describe(unavailableModesHint.name, () => {
  it('needs no hint while every mode is available', () => {
    expect(
      unavailableModesHint(
        modeOptionsForLevel(['auto', 'max'], null, undefined),
      ),
    ).toBeNull();
  });

  it('names the one mode that is unavailable', () => {
    expect(
      unavailableModesHint(modeOptionsForLevel(['auto'], null, undefined)),
    ).toBe('max');
  });

  it('covers both modes at once when neither is available', () => {
    expect(unavailableModesHint(modeOptionsForLevel([], null, undefined))).toBe(
      'both',
    );
  });
});
