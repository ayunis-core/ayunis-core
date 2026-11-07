import type {
  CreateRoutineDto,
  Routine,
  UpdateRoutineDto,
} from '@/pages/routines/model/openapi';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/pages/routines/model/types';

export const EMPTY_ROUTINE_FORM: RoutineFormFields = {
  name: '',
  prompt: '',
  modelId: DEFAULT_MODEL_OPTION,
  dailyTime: '07:00',
  internetEnabled: false,
};

export function routineToFormFields(routine: Routine): RoutineFormFields {
  return {
    name: routine.name,
    prompt: routine.prompt,
    modelId: routine.modelId ?? DEFAULT_MODEL_OPTION,
    dailyTime: routine.dailyTime,
    internetEnabled: routine.internetEnabled,
  };
}

/** The default-model option sends no model, so the backend picks the user's default. */
export function formFieldsToDto(
  fields: RoutineFormFields,
): CreateRoutineDto & UpdateRoutineDto {
  const { modelId, ...rest } = fields;
  return {
    ...rest,
    ...(modelId !== DEFAULT_MODEL_OPTION && { modelId }),
  };
}
