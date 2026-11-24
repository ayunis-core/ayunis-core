import type {
  CreateRoutineDto,
  Routine,
  UpdateRoutineDto,
} from '@/features/routines/model/openapi';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/features/routines/model/types';

export const EMPTY_ROUTINE_FORM: RoutineFormFields = {
  name: '',
  prompt: '',
  modelId: DEFAULT_MODEL_OPTION,
  dailyTime: '07:00',
  internetEnabled: false,
  mcpIntegrationIds: [],
};

export function routineToFormFields(routine: Routine): RoutineFormFields {
  return {
    name: routine.name,
    prompt: routine.prompt,
    modelId: routine.modelId ?? DEFAULT_MODEL_OPTION,
    dailyTime: routine.dailyTime,
    internetEnabled: routine.internetEnabled,
    mcpIntegrationIds: routine.mcpIntegrationIds,
  };
}

/** The default-model option sends no model, so the routine uses the user's default. */
export function formFieldsToCreateDto(
  fields: RoutineFormFields,
): CreateRoutineDto {
  const { modelId, ...rest } = fields;
  return {
    ...rest,
    ...(modelId !== DEFAULT_MODEL_OPTION && { modelId }),
  };
}

/** The default-model option clears a stored model; an omitted one would keep it. */
export function formFieldsToUpdateDto(
  fields: RoutineFormFields,
): UpdateRoutineDto {
  const { modelId, ...rest } = fields;
  return {
    ...rest,
    modelId: modelId === DEFAULT_MODEL_OPTION ? null : modelId,
  };
}
