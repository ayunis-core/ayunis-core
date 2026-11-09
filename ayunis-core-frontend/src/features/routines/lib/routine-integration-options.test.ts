import { describe, expect, it } from 'vitest';
import type { McpIntegration } from '@/features/routines/model/openapi';
import {
  canToggleIntegration,
  routineIntegrationOptions,
} from './routine-integration-options';

const integration = (
  id: string,
  name: string,
  userAuthorized?: boolean,
): McpIntegration => ({ id, name, userAuthorized }) as McpIntegration;

describe('routineIntegrationOptions', () => {
  it('keeps a selected integration that is no longer available, so it can be turned off', () => {
    const options =
      routineIntegrationOptions(
        [integration('tickets', 'Ticketsystem')],
        ['tickets', 'disabled-by-admin'],
      ) ?? [];

    expect(options).toEqual([
      { id: 'tickets', name: 'Ticketsystem', connected: true },
      { id: 'disabled-by-admin', name: null, connected: false },
    ]);
    expect(canToggleIntegration(options[1], true)).toBe(true);
  });

  it('marks no selected integration unavailable before the list has loaded', () => {
    expect(routineIntegrationOptions(undefined, ['tickets'])).toBeNull();
  });

  it('does not let an integration the user has not connected be turned on, only off', () => {
    const [option] =
      routineIntegrationOptions(
        [integration('calendar', 'Kalender', false)],
        [],
      ) ?? [];

    expect(canToggleIntegration(option, false)).toBe(false);
    expect(canToggleIntegration(option, true)).toBe(true);
  });
});
