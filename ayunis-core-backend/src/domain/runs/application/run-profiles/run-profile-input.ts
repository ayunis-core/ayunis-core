/**
 * The profile an entry point runs with, plus the input only that profile
 * needs. One union member per profile.
 */
export interface ChatRunProfileInput {
  readonly id: 'chat';
}

export type RunProfileInput = ChatRunProfileInput;

export type RunProfileId = RunProfileInput['id'];
