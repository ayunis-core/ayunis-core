import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { getSuperAdminAdventCalendarControllerGetCalendarQueryKey } from '@ayunis/api-client';
import type {
  SuperAdminAdventCalendarDoorResponseDto,
  SuperAdminAdventCalendarResponseDto,
} from '@ayunis/api-client/schemas';
import { storeEnabled, storeSavedDoor } from './adventCalendarQueryCache';

const key = getSuperAdminAdventCalendarControllerGetCalendarQueryKey();

describe('storeSavedDoor', () => {
  it('shows the saved door, e.g. its new image, before the calendar is refetched', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<SuperAdminAdventCalendarResponseDto>(key, {
      enabled: true,
      doors: [
        { day: 1, content: null },
        { day: 2, content: null },
      ],
    });
    const saved: SuperAdminAdventCalendarDoorResponseDto = {
      day: 2,
      content: {
        title: 'Bilder',
        body: '',
        media: { type: 'image', vimeoVideoId: null, vimeoHash: null },
        buttons: [],
        updatedAt: '2026-11-27T12:00:00.000Z',
      },
    };

    storeSavedDoor(queryClient, saved);

    expect(
      queryClient.getQueryData<SuperAdminAdventCalendarResponseDto>(key)?.doors,
    ).toEqual([{ day: 1, content: null }, saved]);
  });
});

describe('storeEnabled', () => {
  it('shows the new switch state as soon as the toggle is saved, before the calendar is refetched', () => {
    const queryClient = new QueryClient();
    const doors = [{ day: 1, content: null }];
    queryClient.setQueryData<SuperAdminAdventCalendarResponseDto>(key, {
      enabled: false,
      doors,
    });

    storeEnabled(queryClient, true);

    expect(
      queryClient.getQueryData<SuperAdminAdventCalendarResponseDto>(key),
    ).toEqual({ enabled: true, doors });
  });
});
