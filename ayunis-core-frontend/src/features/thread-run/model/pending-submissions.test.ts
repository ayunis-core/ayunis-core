import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPendingThreadSubmission,
  getPendingThreadSubmission,
  resetThreadSubmission,
  startThreadSubmission,
} from './pending-submissions';

const threadA = 'thread-a';
const threadB = 'thread-b';

describe('pending thread submissions', () => {
  afterEach(() => {
    resetThreadSubmission(threadA);
    resetThreadSubmission(threadB);
  });

  it('clears one thread without removing another pending submission', () => {
    startThreadSubmission(threadA, { text: 'Message A' });
    startThreadSubmission(threadB, { text: 'Message B' });

    clearPendingThreadSubmission(threadA);

    expect(getPendingThreadSubmission(threadA)).toBeNull();
    expect(getPendingThreadSubmission(threadB)).toBe('Message B');
  });
});
