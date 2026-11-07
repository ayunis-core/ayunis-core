import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_OPTION } from '@/features/routines/model/types';
import { formFieldsToDto } from './routine-form-values';

describe('formFieldsToDto', () => {
  const fields = {
    name: 'Amtsblatt',
    prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
    dailyTime: '07:30',
    internetEnabled: true,
  };

  it('leaves the model out for the default-model option', () => {
    expect(
      formFieldsToDto({ ...fields, modelId: DEFAULT_MODEL_OPTION }),
    ).not.toHaveProperty('modelId');
  });

  it('sends a chosen model', () => {
    expect(
      formFieldsToDto({
        ...fields,
        modelId: '890dbfa7-989f-4f2b-9808-7e722dcb2bf0',
      }).modelId,
    ).toBe('890dbfa7-989f-4f2b-9808-7e722dcb2bf0');
  });
});
