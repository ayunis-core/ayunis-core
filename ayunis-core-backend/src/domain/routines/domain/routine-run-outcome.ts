/**
 * How one execution of a routine ended. `failureReason` is a machine-readable
 * code (an application error code, `timeout`, or `finish_routine_not_called`).
 */
export type RoutineRunOutcome =
  | { readonly status: 'succeeded' }
  | { readonly status: 'failed'; readonly failureReason: string };
