import type { SURFACE_REGISTRY } from 'src/config/surface-registry';

/**
 * The profile an entry point runs with, plus the input only that profile
 * needs. One union member per profile.
 */
export type ChatRunProfileInput = typeof SURFACE_REGISTRY.web.run.profile;

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
    /** Web hosts the routine's web tools may reach. Absent: any host. */
    readonly allowedDomains?: readonly string[];
  };
}

/** The same chat, run from the Outlook add-in pane instead of the web app. */
export type OutlookRunProfileInput =
  typeof SURFACE_REGISTRY.outlook.run.profile;

export type RunProfileInput =
  ChatRunProfileInput | OutlookRunProfileInput | RoutineRunProfileInput;

export type RunProfileId = RunProfileInput['id'];
