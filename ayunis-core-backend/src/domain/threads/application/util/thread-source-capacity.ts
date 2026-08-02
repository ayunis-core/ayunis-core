import type { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import { ThreadSourceLimitExceededError } from '../threads.errors';

export function assertThreadHasSourceCapacity(
  assignments: SourceAssignment[],
  additionalCount = 1,
): void {
  if (assignments.length + additionalCount > ThreadsConstants.MAX_SOURCES) {
    throw new ThreadSourceLimitExceededError(ThreadsConstants.MAX_SOURCES);
  }
}
