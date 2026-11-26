import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
  type RoutineScheduleFields,
} from '@/features/routines/model/types';
import type { Routine } from '@/features/routines/model/openapi';
import {
  formFieldsToCreateDto,
  formFieldsToUpdateDto,
  routineToFormFields,
} from './routine-form-values';

describe('routine form values', () => {
  const fields: Omit<RoutineFormFields, 'modelId'> = {
    name: 'Amtsblatt',
    prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
    schedule: {
      frequency: 'daily',
      time: '07:30',
      weekdays: [1],
      monthDay: '1',
    },
    internetAccess: 'allowlist',
    allowedDomains: 'nrw.de\n  recht.nrw.de, bund.de\n\n',
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

    it('sends a chosen mode instead of a model', () => {
      const dto = formFieldsToCreateDto({ ...fields, modelId: 'max' });
      expect(dto.mode).toBe('max');
      expect(dto).not.toHaveProperty('modelId');
    });
  });

  describe('formFieldsToUpdateDto', () => {
    it('clears a stored model for the default-model option', () => {
      expect(
        formFieldsToUpdateDto({ ...fields, modelId: DEFAULT_MODEL_OPTION })
          .modelId,
      ).toBeNull();
    });

    it('clears a stored mode for the default-model option', () => {
      expect(
        formFieldsToUpdateDto({ ...fields, modelId: DEFAULT_MODEL_OPTION })
          .mode,
      ).toBeNull();
    });

    it('sends a chosen model and clears a stored mode', () => {
      const dto = formFieldsToUpdateDto({ ...fields, modelId });
      expect(dto.modelId).toBe(modelId);
      expect(dto.mode).toBeNull();
    });

    it('sends a chosen mode and clears a stored model', () => {
      const dto = formFieldsToUpdateDto({ ...fields, modelId: 'auto' });
      expect(dto.mode).toBe('auto');
      expect(dto.modelId).toBeNull();
    });

    it('sends one allowed domain per entry, however they are separated', () => {
      expect(
        formFieldsToUpdateDto({ ...fields, modelId }).allowedDomains,
      ).toEqual(['nrw.de', 'recht.nrw.de', 'bund.de']);
    });

    it('keeps the stored domains in another mode, so an edit of the hidden list cannot fail the save', () => {
      expect(
        formFieldsToUpdateDto({
          ...fields,
          modelId,
          internetAccess: 'off',
          allowedDomains: 'kein-host',
        }),
      ).not.toHaveProperty('allowedDomains');
    });
  });

  describe('routineToFormFields', () => {
    const routine = (choice: Pick<Routine, 'modelId' | 'mode'>): Routine => ({
      id: 'f2a3c0de-6b1f-4a0e-9a7e-2f0c5d1b8e11',
      name: fields.name,
      prompt: fields.prompt,
      schedule: { frequency: 'daily', time: '07:30' },
      internetAccess: 'off',
      allowedDomains: [],
      enabled: true,
      lastRunStatus: null,
      lastRunAt: null,
      lastRunFailureReason: null,
      consecutiveFailureCount: 0,
      nextRunAt: null,
      pausedAt: null,
      sourceToolCallId: null,
      marketplaceIdentifier: null,
      createdAt: '2026-11-25T08:00:00.000Z',
      updatedAt: '2026-11-25T08:00:00.000Z',
      ...choice,
    });

    it.each([
      [{ modelId, mode: null }, modelId],
      [{ modelId: null, mode: 'auto' as const }, 'auto'],
      [{ modelId: null, mode: null }, DEFAULT_MODEL_OPTION],
    ])('selects the stored model choice %o', (choice, selected) => {
      expect(routineToFormFields(routine(choice)).modelId).toBe(selected);
    });
  });

  describe('schedule', () => {
    const withSchedule = (schedule: Partial<RoutineScheduleFields>) => ({
      ...fields,
      modelId,
      schedule: { ...fields.schedule, ...schedule },
    });

    it("sends only the chosen frequency's fields, so the values kept for a switch back are not rejected", () => {
      expect(
        formFieldsToUpdateDto(withSchedule({ frequency: 'daily' })).schedule,
      ).toEqual({ frequency: 'daily', time: '07:30' });
      expect(
        formFieldsToUpdateDto(
          withSchedule({ frequency: 'weekly', weekdays: [4, 1] }),
        ).schedule,
      ).toEqual({ frequency: 'weekly', time: '07:30', weekdays: [1, 4] });
    });

    it('sends the month day as a number, or as "last" for the last day', () => {
      expect(
        formFieldsToCreateDto(
          withSchedule({ frequency: 'monthly', monthDay: '15' }),
        ).schedule,
      ).toEqual({ frequency: 'monthly', time: '07:30', monthDay: 15 });
      expect(
        formFieldsToCreateDto(
          withSchedule({ frequency: 'monthly', monthDay: 'last' }),
        ).schedule,
      ).toEqual({ frequency: 'monthly', time: '07:30', monthDay: 'last' });
    });
  });
});
