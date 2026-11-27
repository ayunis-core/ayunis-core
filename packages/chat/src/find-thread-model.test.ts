import { describe, expect, it } from 'vitest';
import { findThreadModel } from './find-thread-model';

const effectiveModels = [
  {
    id: 'team-permit-id',
    modelId: 'catalog-model-id',
  },
];

describe('findThreadModel', () => {
  it('finds the current grant for an existing chat by catalog model', () => {
    expect(
      findThreadModel(effectiveModels, {
        permittedModelId: 'stored-org-permit-id',
        modelId: 'catalog-model-id',
      }),
    ).toBe(effectiveModels[0]);
  });

  it('keeps exact permit matching for responses without a catalog model', () => {
    expect(
      findThreadModel(effectiveModels, {
        permittedModelId: 'team-permit-id',
      }),
    ).toBe(effectiveModels[0]);
  });

  it('does not match a grant for a different catalog model', () => {
    expect(
      findThreadModel(effectiveModels, {
        permittedModelId: 'stored-org-permit-id',
        modelId: 'different-catalog-model-id',
      }),
    ).toBeUndefined();
  });
});
