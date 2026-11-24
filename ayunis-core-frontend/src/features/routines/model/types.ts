/** Select value standing for "the user's default model" (stored as no model). */
export const DEFAULT_MODEL_OPTION = 'default';

export interface RoutineFormFields {
  name: string;
  prompt: string;
  /** A permitted model id, or {@link DEFAULT_MODEL_OPTION}. */
  modelId: string;
  /** HH:mm, Europe/Berlin. */
  dailyTime: string;
  internetEnabled: boolean;
  mcpIntegrationIds: string[];
}
