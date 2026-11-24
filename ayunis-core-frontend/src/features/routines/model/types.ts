import type { RoutineInternetAccess } from '@/features/routines/model/openapi';

/** Select value standing for "the user's default model" (stored as no model). */
export const DEFAULT_MODEL_OPTION = 'default';

export interface RoutineFormFields {
  name: string;
  prompt: string;
  /** A permitted model id, or {@link DEFAULT_MODEL_OPTION}. */
  modelId: string;
  /** HH:mm, Europe/Berlin. */
  dailyTime: string;
  internetAccess: RoutineInternetAccess;
  /** One domain per line; kept while another mode is chosen. */
  allowedDomains: string;
}
