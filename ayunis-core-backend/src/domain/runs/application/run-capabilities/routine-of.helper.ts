import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import type { RoutineRunProfileInput } from 'src/domain/runs/application/run-profiles/run-profile-input';
import type { RunCapabilityContext } from './run-capability-context';

/** The routine input of a routine run; routine capabilities only run in one. */
export function routineOf(
  context: RunCapabilityContext,
): RoutineRunProfileInput['routine'] {
  if (context.profile.id !== 'routine') {
    throw new RunInvalidInputError('Capability needs a routine run', {
      profile: context.profile.id,
    });
  }
  return context.profile.routine;
}
