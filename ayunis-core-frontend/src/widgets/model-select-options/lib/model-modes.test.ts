import { describe, expect, it } from 'vitest';
import { getModeValue, resolveSelectedModel } from './model-modes';

const balanced = { id: 'balanced' };
const strong = { id: 'strong' };
const anonymousOnly = { id: 'anonymous-only' };
const resolutions = [
  {
    mode: 'auto' as const,
    permittedModelId: 'balanced',
    anonymousPermittedModelId: 'anonymous-only',
  },
  {
    mode: 'max' as const,
    permittedModelId: null,
    anonymousPermittedModelId: null,
  },
];
const models = [balanced, strong, anonymousOnly];

describe(resolveSelectedModel.name, () => {
  it('keeps a concrete model id even before models are loaded', () => {
    expect(resolveSelectedModel('some-model-id', [], resolutions)).toEqual({
      model: undefined,
      modelId: 'some-model-id',
      mode: null,
    });
  });

  it('resolves a mode to the model the backend reports', () => {
    expect(
      resolveSelectedModel(getModeValue('auto'), models, resolutions),
    ).toEqual({ model: balanced, modelId: 'balanced', mode: 'auto' });
  });

  it('uses the anonymous resolution while anonymous mode is on', () => {
    expect(
      resolveSelectedModel(getModeValue('auto'), models, resolutions, true)
        .modelId,
    ).toBe('anonymous-only');
  });

  it('resolves an unusable mode to no model', () => {
    expect(
      resolveSelectedModel(getModeValue('max'), models, resolutions),
    ).toEqual({ model: undefined, modelId: undefined, mode: 'max' });
  });

  it('resolves nothing before resolutions have loaded', () => {
    expect(
      resolveSelectedModel(getModeValue('auto'), models, []).modelId,
    ).toBeUndefined();
  });

  it('uses the default selection model for its mode until resolutions load', () => {
    const defaultSelection = {
      mode: 'auto' as const,
      permittedModelId: 'strong',
    };
    expect(
      resolveSelectedModel(
        getModeValue('auto'),
        models,
        [],
        false,
        defaultSelection,
      ).modelId,
    ).toBe('strong');
    expect(
      resolveSelectedModel(
        getModeValue('max'),
        models,
        [],
        false,
        defaultSelection,
      ).modelId,
    ).toBeUndefined();
  });

  it('uses the default selection model before the models list loads', () => {
    const defaultSelection = {
      mode: 'auto' as const,
      permittedModelId: 'strong',
    };
    expect(
      resolveSelectedModel(
        getModeValue('auto'),
        [],
        [],
        false,
        defaultSelection,
      ),
    ).toEqual({ model: undefined, modelId: 'strong', mode: 'auto' });
  });

  it('prefers loaded resolutions over the default selection model', () => {
    const defaultSelection = {
      mode: 'max' as const,
      permittedModelId: 'strong',
    };
    expect(
      resolveSelectedModel(
        getModeValue('max'),
        models,
        resolutions,
        false,
        defaultSelection,
      ).modelId,
    ).toBeUndefined();
  });
});
