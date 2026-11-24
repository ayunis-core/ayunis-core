import type {
  RoutineFrequency,
  RoutineInternetAccess,
} from '@/features/routines/model/openapi';

/** Select value standing for "the user's default model" (stored as no model). */
export const DEFAULT_MODEL_OPTION = 'default';

/** Month-day select value for the last day of the month. */
export const LAST_MONTH_DAY = 'last';

export interface RoutineScheduleFields {
  frequency: RoutineFrequency;
  /** HH:mm, Europe/Berlin. */
  time: string;
  /** ISO weekdays (1 = Monday); kept while another frequency is chosen. */
  weekdays: number[];
  /** "1"–"28" or {@link LAST_MONTH_DAY}; kept while another frequency is chosen. */
  monthDay: string;
}

export interface RoutineFormFields {
  name: string;
  prompt: string;
  /** A permitted model id, or {@link DEFAULT_MODEL_OPTION}. */
  modelId: string;
  schedule: RoutineScheduleFields;
  internetAccess: RoutineInternetAccess;
  /** One domain per line; kept while another mode is chosen. */
  allowedDomains: string;
}
