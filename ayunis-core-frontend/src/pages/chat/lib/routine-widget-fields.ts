import {
  EMPTY_ROUTINE_FORM,
  formatAllowedDomains,
  routineToFormFields,
  type Routine,
  type RoutineFormFields,
  type RoutineInternetAccess,
} from '@/features/routines';

export interface CreateRoutineParams {
  name?: string;
  prompt?: string;
  daily_time?: string;
  internet_access?: RoutineInternetAccess;
  allowed_domains?: string[];
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
    internetAccess: params.internet_access ?? EMPTY_ROUTINE_FORM.internetAccess,
    allowedDomains: formatAllowedDomains(params.allowed_domains ?? []),
  };
}

/**
 * Empty or omitted params mean "unchanged" and keep the stored value; the
 * model always stays the stored one.
 */
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
    internetAccess: params.internet_access ?? stored.internetAccess,
    allowedDomains: params.allowed_domains
      ? formatAllowedDomains(params.allowed_domains)
      : stored.allowedDomains,
  };
}
