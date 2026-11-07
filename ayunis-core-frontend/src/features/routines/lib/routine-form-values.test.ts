import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_OPTION } from '@/features/routines/model/types';
import {
  formFieldsToCreateDto,
  formFieldsToUpdateDto,
} from './routine-form-values';

describe('routine form values', () => {
  const fields = {
    name: 'Amtsblatt',
    prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
    dailyTime: '07:30',
    internetEnabled: true,
  };
  const modelId = '890dbfa7-989f-4f2b-9808-7e722dcb2bf0';

  describe('formFieldsToCreateDto', () => {
    it('leaves the model out for the default-model option', () => {
      expect(
        formFieldsToCreateDto({ ...fields, modelId: DEFAULT_MODEL_OPTION }),
      ).not.toHaveProperty('modelId');
    });

    it('sends a chosen model', () => {
      expect(formFieldsToCreateDto({ ...fields, modelId }).modelId).toBe(
        modelId,
      );
    });
  });

  describe('formFieldsToUpdateDto', () => {
    it('clears a stored model for the default-model option', () => {
      expect(
        formFieldsToUpdateDto({ ...fields, modelId: DEFAULT_MODEL_OPTION })
          .modelId,
      ).toBeNull();
    });

    it('sends a chosen model', () => {
      expect(formFieldsToUpdateDto({ ...fields, modelId }).modelId).toBe(
        modelId,
      );
    });
  });
});
