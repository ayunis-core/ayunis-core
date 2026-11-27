import { describe, expect, it } from 'vitest';
import { createThreadSubmissions } from './thread-submissions';

const threadA = 'thread-a';
const threadB = 'thread-b';

describe('thread submissions', () => {
  it('clears one thread without removing another pending submission', () => {
    const submissions = createThreadSubmissions();
    submissions.startSubmission(threadA, { text: 'Message A' });
    submissions.startSubmission(threadB, { text: 'Message B' });

    submissions.clearPendingSubmission(threadA);

    expect(submissions.getPendingSubmission(threadA)).toBeNull();
    expect(submissions.getPendingSubmission(threadB)).toBe('Message B');
  });

  it('hands a failed message back once, so the composer restores it a single time', () => {
    const submissions = createThreadSubmissions();
    submissions.startSubmission(threadA, { text: 'Message A' });

    submissions.completeSubmission(threadA, true);

    expect(submissions.consumeFailedSubmission(threadA)).toEqual({
      text: 'Message A',
    });
    expect(submissions.consumeFailedSubmission(threadA)).toBeNull();
  });
});
