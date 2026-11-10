import { describe, expect, it } from 'vitest';
import type { Routine } from '@/features/routines';
import { editRoutineParamsToFormFields } from './routine-widget-fields';

describe('editRoutineParamsToFormFields', () => {
  const routine = {
    id: '4f1c2b6e-8d0a-4c55-9a1e-2b7f3c9d0e11',
    name: 'Amtsblatt',
    prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
    modelId: '890dbfa7-989f-4f2b-9808-7e722dcb2bf0',
    dailyTime: '07:30',
    internetEnabled: true,
  } as Routine;

  it("keeps the routine's chosen model, so saving the edit does not reset it to the default", () => {
    expect(
      editRoutineParamsToFormFields({ daily_time: '08:00' }, routine).modelId,
    ).toBe(routine.modelId);
  });

  it('keeps stored values for fields the model left empty', () => {
    expect(
      editRoutineParamsToFormFields(
        { name: '', prompt: '', daily_time: '', internet_enabled: false },
        routine,
      ),
    ).toEqual({
      name: 'Amtsblatt',
      prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
      modelId: routine.modelId,
      dailyTime: '07:30',
      internetEnabled: false,
    });
  });
});
