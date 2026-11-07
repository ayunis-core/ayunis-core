/**
 * How one execution of a routine ended. `failureReason` is a machine-readable
 * code (an application error code, `timeout`, or `finish_routine_not_called`).
 * A skipped execution did not run, for a reason that is not the routine's
 * fault (`permission_missing`: the owner's role lacks the manage routines
 * permission), so it is not counted as a failure.
 */
export type RoutineRunOutcome =
  | { readonly status: 'succeeded' }
  | { readonly status: 'failed'; readonly failureReason: string }
  | { readonly status: 'skipped'; readonly reason: RoutineSkipReason };

export type RoutineSkipReason = 'permission_missing';
