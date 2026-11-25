import { describe, expect, it } from 'vitest';
import type { Routine } from '@/features/routines';
import {
  createRoutineParamsToFormFields,
  editRoutineParamsToFormFields,
} from './routine-widget-fields';

describe('editRoutineParamsToFormFields', () => {
  const routine = {
    id: '4f1c2b6e-8d0a-4c55-9a1e-2b7f3c9d0e11',
    name: 'Amtsblatt',
    prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
    modelId: '890dbfa7-989f-4f2b-9808-7e722dcb2bf0',
    mode: null,
    schedule: { frequency: 'weekly', time: '07:30', weekdays: [1, 4] },
    internetAccess: 'allowlist',
    allowedDomains: ['nrw.de', 'bund.de'],
  } as Routine;
  const storedSchedule = {
    frequency: 'weekly',
    time: '07:30',
    weekdays: [1, 4],
    monthDay: '1',
  };

  it("keeps the routine's chosen model, so saving the edit does not reset it to the default", () => {
    expect(
      editRoutineParamsToFormFields({ name: 'Gesetzblatt' }, routine).modelId,
    ).toBe(routine.modelId);
  });

  it('keeps stored values for fields the model left empty or out', () => {
    expect(
      editRoutineParamsToFormFields({ name: '', prompt: '' }, routine),
    ).toEqual({
      name: 'Amtsblatt',
      prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
      modelId: routine.modelId,
      schedule: storedSchedule,
      internetAccess: 'allowlist',
      allowedDomains: 'nrw.de\nbund.de',
    });
  });

  it('takes the internet access and domains the model proposes', () => {
    expect(
      editRoutineParamsToFormFields(
        { internet_access: 'allowlist', allowed_domains: ['recht.nrw.de'] },
        routine,
      ),
    ).toMatchObject({
      internetAccess: 'allowlist',
      allowedDomains: 'recht.nrw.de',
    });
  });

  it('replaces the stored schedule with a proposed one', () => {
    expect(
      editRoutineParamsToFormFields(
        {
          schedule: { frequency: 'monthly', time: '08:15', month_day: 'last' },
        },
        routine,
      ).schedule,
    ).toEqual({
      ...storedSchedule,
      frequency: 'monthly',
      time: '08:15',
      monthDay: 'last',
    });
  });
});

describe('createRoutineParamsToFormFields', () => {
  it('takes the proposed weekly schedule', () => {
    expect(
      createRoutineParamsToFormFields({
        schedule: { frequency: 'weekly', time: '08:00', weekdays: [1] },
      }).schedule,
    ).toMatchObject({ frequency: 'weekly', time: '08:00', weekdays: [1] });
  });
});
