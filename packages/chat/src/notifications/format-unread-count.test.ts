import { describe, expect, it } from 'vitest';
import { formatUnreadCount } from './format-unread-count';

describe('formatUnreadCount', () => {
  it('hides the badge without unread notifications', () => {
    expect(formatUnreadCount(0)).toBeNull();
  });

  it('shows the number of unread notifications', () => {
    expect(formatUnreadCount(3)).toBe('3');
  });

  it('caps a large count', () => {
    expect(formatUnreadCount(140)).toBe('99+');
  });
});
