import {
  ModelMode,
  RoutineInternetAccess,
  type CreateRoutineDto,
  type Routine,
  type UpdateRoutineDto,
} from '@/features/routines/model/openapi';
import {
  DEFAULT_MODEL_OPTION,
  type RoutineFormFields,
} from '@/features/routines/model/types';
import {
  DEFAULT_SCHEDULE_FIELDS,
  fieldsToSchedule,
  scheduleToFields,
} from '@/features/routines/lib/routine-schedule';

export const EMPTY_ROUTINE_FORM: RoutineFormFields = {
  name: '',
  prompt: '',
  modelId: DEFAULT_MODEL_OPTION,
  schedule: DEFAULT_SCHEDULE_FIELDS,
  internetAccess: RoutineInternetAccess.off,
  allowedDomains: '',
};

export function routineToFormFields(routine: Routine): RoutineFormFields {
  return {
    name: routine.name,
    prompt: routine.prompt,
    modelId: routine.mode ?? routine.modelId ?? DEFAULT_MODEL_OPTION,
    schedule: scheduleToFields(routine.schedule),
    internetAccess: routine.internetAccess,
    allowedDomains: formatAllowedDomains(routine.allowedDomains),
  };
}

const MODEL_MODES: readonly string[] = Object.values(ModelMode);

/** The mode the model field's value stands for; null for a model or the default. */
export function selectedModelMode(value: string): ModelMode | null {
  return MODEL_MODES.includes(value) ? (value as ModelMode) : null;
}

export function formatAllowedDomains(domains: readonly string[]): string {
  return domains.join('\n');
}

/** Entries may be separated by lines, spaces, commas or semicolons. */
export function parseAllowedDomains(text: string): string[] {
  return text.split(/[\s,;]+/).filter(Boolean);
}

/**
 * The domain list is shown, and sent, only for "only these domains"; in the
 * other modes the routine keeps its stored list.
 */
function allowedDomainsToSend(
  fields: RoutineFormFields,
): Pick<CreateRoutineDto, 'allowedDomains'> {
  return fields.internetAccess === RoutineInternetAccess.allowlist
    ? { allowedDomains: parseAllowedDomains(fields.allowedDomains) }
    : {};
}

/** The default-model option sends neither, so the routine uses the user's default. */
function modelChoiceToCreate(
  value: string,
): Pick<CreateRoutineDto, 'modelId' | 'mode'> {
  const mode = selectedModelMode(value);
  if (mode) return { mode };
  return value === DEFAULT_MODEL_OPTION ? {} : { modelId: value };
}

export function formFieldsToCreateDto(
  fields: RoutineFormFields,
): CreateRoutineDto {
  return {
    name: fields.name,
    prompt: fields.prompt,
    schedule: fieldsToSchedule(fields.schedule),
    internetAccess: fields.internetAccess,
    ...allowedDomainsToSend(fields),
    ...modelChoiceToCreate(fields.modelId),
  };
}

/** Both are always sent: omitted ones would keep a stored model or mode. */
export function formFieldsToUpdateDto(
  fields: RoutineFormFields,
): UpdateRoutineDto {
  const mode = selectedModelMode(fields.modelId);
  const isModel = !mode && fields.modelId !== DEFAULT_MODEL_OPTION;
  return {
    name: fields.name,
    prompt: fields.prompt,
    schedule: fieldsToSchedule(fields.schedule),
    internetAccess: fields.internetAccess,
    ...allowedDomainsToSend(fields),
    modelId: isModel ? fields.modelId : null,
    mode,
  };
}
