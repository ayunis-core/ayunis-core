import { describe, expect, it } from 'vitest';
import type { NotificationResponseDto } from '@ayunis/api-client/schemas';
import { withOpenNotification } from './with-open-notification';

function aNotification(
  id: string,
  createdAt: string,
  overrides: Partial<NotificationResponseDto> = {},
): NotificationResponseDto {
  return {
    id,
    type: 'routine',
    headline: `Notification ${id}`,
    body: '',
    createdAt,
    readAt: null,
    ...overrides,
  } as NotificationResponseDto;
}

const newer = aNotification('newer', '2026-11-07T06:00:00.000Z');
const older = aNotification('older', '2026-11-05T06:00:00.000Z');
const openRead = aNotification('open', '2026-11-06T06:00:00.000Z', {
  readAt: '2026-11-07T08:00:00.000Z',
});

const HIDDEN = { unreadFirst: false };
const SHOWN = { unreadFirst: true };

describe('withOpenNotification', () => {
  it('keeps the open notification listed in its place once reading it dropped it from the unread list', () => {
    expect(
      withOpenNotification([newer, older], openRead, HIDDEN).map((n) => n.id),
    ).toEqual(['newer', 'open', 'older']);
  });

  it('lists the open notification last when it is older than every listed one', () => {
    expect(
      withOpenNotification([newer], openRead, HIDDEN).map((n) => n.id),
    ).toEqual(['newer', 'open']);
  });

  it('does not list the open notification twice while the list still has it', () => {
    expect(
      withOpenNotification([newer, openRead, older], openRead, SHOWN),
    ).toEqual([newer, openRead, older]);
  });

  it('does not list the open notification under a type filter it does not match', () => {
    expect(
      withOpenNotification([newer, older], openRead, {
        ...HIDDEN,
        type: 'routine_error',
      }),
    ).toEqual([newer, older]);
  });

  it('keeps the open notification listed behind the unread ones once reading it moved it off a page of unread ones', () => {
    const olderRead = aNotification('older-read', '2026-11-04T06:00:00.000Z', {
      readAt: '2026-11-07T08:00:00.000Z',
    });
    expect(
      withOpenNotification([newer, older], openRead, SHOWN).map((n) => n.id),
    ).toEqual(['newer', 'older', 'open']);
    expect(
      withOpenNotification([newer, older, olderRead], openRead, SHOWN).map(
        (n) => n.id,
      ),
    ).toEqual(['newer', 'older', 'open', 'older-read']);
  });
});
