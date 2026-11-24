import {
  EMPTY_ROUTINE_FORM,
  formatAllowedDomains,
  routineToFormFields,
  type Routine,
  type RoutineFormFields,
  type RoutineFrequency,
  type RoutineInternetAccess,
  type RoutineScheduleFields,
} from '@/features/routines';

export interface RoutineScheduleParams {
  frequency?: RoutineFrequency;
  time?: string;
  weekdays?: number[];
  month_day?: number | 'last';
}

export interface CreateRoutineParams {
  name?: string;
  prompt?: string;
  schedule?: RoutineScheduleParams;
  internet_access?: RoutineInternetAccess;
  allowed_domains?: string[];
}

export interface EditRoutineParams extends CreateRoutineParams {
  routine_id?: string;
  change_summary?: string;
}

/**
 * The proposed schedule over `base`; while streaming, parts not yet proposed
 * keep the base's values.
 */
function scheduleParamsToFields(
  params: RoutineScheduleParams,
  base: RoutineScheduleFields,
): RoutineScheduleFields {
  return {
    frequency: params.frequency ?? base.frequency,
    time: params.time || base.time,
    weekdays: params.weekdays ?? base.weekdays,
    monthDay:
      params.month_day === undefined ? base.monthDay : String(params.month_day),
  };
}

/** The model is not a tool parameter, so the widget starts on the default model. */
export function createRoutineParamsToFormFields(
  params: CreateRoutineParams,
): RoutineFormFields {
  return {
    ...EMPTY_ROUTINE_FORM,
    name: params.name ?? '',
    prompt: params.prompt ?? '',
    schedule: scheduleParamsToFields(
      params.schedule ?? {},
      EMPTY_ROUTINE_FORM.schedule,
    ),
    internetAccess: params.internet_access ?? EMPTY_ROUTINE_FORM.internetAccess,
    allowedDomains: formatAllowedDomains(params.allowed_domains ?? []),
  };
}

/**
 * Empty or omitted params mean "unchanged" and keep the stored value, the
 * schedule included; the model always stays the stored one.
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
    schedule: params.schedule
      ? scheduleParamsToFields(params.schedule, stored.schedule)
      : stored.schedule,
    internetAccess: params.internet_access ?? stored.internetAccess,
    allowedDomains: params.allowed_domains
      ? formatAllowedDomains(params.allowed_domains)
      : stored.allowedDomains,
  };
}

/**
 * Streaming replaces the params' objects on every update; this key stays
 * equal while the schedule does, for an effect's dependencies.
 */
export function scheduleParamsKey(
  schedule: RoutineScheduleParams | undefined,
): string | undefined {
  return schedule && JSON.stringify(schedule);
}

export function parseScheduleParamsKey(
  key: string | undefined,
): RoutineScheduleParams | undefined {
  return key === undefined
    ? undefined
    : (JSON.parse(key) as RoutineScheduleParams);
}
