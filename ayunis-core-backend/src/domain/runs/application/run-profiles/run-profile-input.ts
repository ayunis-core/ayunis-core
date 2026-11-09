/**
 * The profile an entry point runs with, plus the input only that profile
 * needs. One union member per profile.
 */
export interface ChatRunProfileInput {
  readonly id: 'chat';
}

/**
 * The routine's task is the run's user message, not part of this input, so a
 * chat that continues the routine thread still sees it in the history.
 */
export interface RoutineRunProfileInput {
  readonly id: 'routine';
  readonly routine: {
    readonly name: string;
    /** The routine's own toggle; the org's internet setting still applies. */
    readonly internetEnabled: boolean;
  };
}

/** The same chat, run from the Outlook add-in pane instead of the web app. */
export interface OutlookRunProfileInput {
  readonly id: 'outlook';
}

export type RunProfileInput =
  ChatRunProfileInput | OutlookRunProfileInput | RoutineRunProfileInput;

export type RunProfileId = RunProfileInput['id'];
