import { describe, expect, it } from 'vitest';
import { formatTranscriptTime } from './format-transcript-time';

describe('formatTranscriptTime', () => {
  it('shows the hour only once a turn starts past the first hour, so long meetings stay unambiguous', () => {
    expect(formatTranscriptTime(65.9)).toBe('01:05');
    expect(formatTranscriptTime(3599)).toBe('59:59');
    expect(formatTranscriptTime(3600)).toBe('1:00:00');
    expect(formatTranscriptTime(10_799.5)).toBe('2:59:59');
  });
});
