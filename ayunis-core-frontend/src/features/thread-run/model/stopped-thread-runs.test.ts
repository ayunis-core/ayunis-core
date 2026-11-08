import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetStoppedThreadRunsExcept,
  isThreadRunStopped,
  markThreadRunStopped,
} from './stopped-thread-runs';

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

describe('stopped thread runs', () => {
  afterEach(() => forgetStoppedThreadRunsExcept(new Set()));

  it('remembers a stopped run while the server still lists it', () => {
    markThreadRunStopped(threadId);

    forgetStoppedThreadRunsExcept(new Set([threadId]));

    expect(isThreadRunStopped(threadId)).toBe(true);
  });

  it('forgets a stopped run once the server no longer lists it', () => {
    markThreadRunStopped(threadId);

    forgetStoppedThreadRunsExcept(new Set([otherThreadId]));

    expect(isThreadRunStopped(threadId)).toBe(false);
  });
});
