import type { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import { ThreadSourceLimitExceededError } from '../threads.errors';

export function assertThreadHasSourceCapacity(
  assignments: SourceAssignment[],
): void {
  if (assignments.length >= ThreadsConstants.MAX_SOURCES) {
    throw new ThreadSourceLimitExceededError(ThreadsConstants.MAX_SOURCES);
  }
}
