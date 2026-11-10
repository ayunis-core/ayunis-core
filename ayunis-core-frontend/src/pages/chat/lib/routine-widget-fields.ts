import {
  EMPTY_ROUTINE_FORM,
  routineToFormFields,
  type Routine,
  type RoutineFormFields,
} from '@/features/routines';

export interface CreateRoutineParams {
  name?: string;
  prompt?: string;
  daily_time?: string;
  internet_enabled?: boolean;
}

export interface EditRoutineParams extends CreateRoutineParams {
  routine_id?: string;
  change_summary?: string;
}

/** The model is not a tool parameter, so the widget starts on the default model. */
export function createRoutineParamsToFormFields(
  params: CreateRoutineParams,
): RoutineFormFields {
  return {
    ...EMPTY_ROUTINE_FORM,
    name: params.name ?? '',
    prompt: params.prompt ?? '',
    dailyTime: params.daily_time || EMPTY_ROUTINE_FORM.dailyTime,
    internetEnabled: params.internet_enabled ?? false,
  };
}

/** Empty params mean "unchanged" and keep the stored value; the model always stays the stored one. */
export function editRoutineParamsToFormFields(
  params: EditRoutineParams,
  routine?: Routine,
): RoutineFormFields {
  const stored = routine ? routineToFormFields(routine) : EMPTY_ROUTINE_FORM;
  return {
    ...stored,
    name: params.name || stored.name,
    prompt: params.prompt || stored.prompt,
    dailyTime: params.daily_time || stored.dailyTime,
    internetEnabled: params.internet_enabled ?? stored.internetEnabled,
  };
}
