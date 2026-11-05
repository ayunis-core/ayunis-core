import { describe, expect, it } from 'vitest';
import {
  createProcessingPollInterval,
  PROCESSING_POLL_FAST_MS,
  PROCESSING_POLL_FAST_WINDOW_MS,
  PROCESSING_POLL_SLOW_MS,
} from './processing-poll';

function clock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('createProcessingPollInterval', () => {
  it('does not poll while nothing is processing', () => {
    const poll = createProcessingPollInterval(clock().now);
    expect(poll(false)).toBe(false);
  });

  it('polls fast while processing is younger than the window', () => {
    const c = clock();
    const poll = createProcessingPollInterval(c.now);
    expect(poll(true)).toBe(PROCESSING_POLL_FAST_MS);
    c.advance(PROCESSING_POLL_FAST_WINDOW_MS - 1);
    expect(poll(true)).toBe(PROCESSING_POLL_FAST_MS);
  });

  it('slows down once the window has passed', () => {
    const c = clock();
    const poll = createProcessingPollInterval(c.now);
    poll(true);
    c.advance(PROCESSING_POLL_FAST_WINDOW_MS);
    expect(poll(true)).toBe(PROCESSING_POLL_SLOW_MS);
  });

  it('restarts the fast window when processing stops and resumes', () => {
    const c = clock();
    const poll = createProcessingPollInterval(c.now);
    poll(true);
    c.advance(PROCESSING_POLL_FAST_WINDOW_MS + 1);
    expect(poll(true)).toBe(PROCESSING_POLL_SLOW_MS);
    expect(poll(false)).toBe(false);
    expect(poll(true)).toBe(PROCESSING_POLL_FAST_MS);
  });
});
