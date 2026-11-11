import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackOnboardingChanges } from './trackOnboardingChanges';

const client = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('@/shared/lib/openpanel', () => ({ openPanel: client }));

beforeEach(() => {
  vi.resetAllMocks();
  client.track.mockResolvedValue(undefined);
});

describe(trackOnboardingChanges.name, () => {
  it('sends one event per step whose checked state changed', () => {
    trackOnboardingChanges(
      {
        completedStepIds: ['sendFirstMessage', 'uploadDocument'],
        hidden: false,
      },
      { completedStepIds: ['uploadDocument', 'createSkill'], hidden: false },
    );

    expect(client.track.mock.calls).toEqual([
      [
        'onboarding_step_toggled',
        { step_id: 'sendFirstMessage', checked: false },
      ],
      ['onboarding_step_toggled', { step_id: 'createSkill', checked: true }],
    ]);
  });

  it('never sends step ids that are not in the onboarding config', () => {
    trackOnboardingChanges(
      { completedStepIds: ['retiredStep'], hidden: false },
      { completedStepIds: ['unknown step text'], hidden: false },
    );

    expect(client.track).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'sends hidden: %s when the checklist visibility changed',
    (hidden) => {
      trackOnboardingChanges(
        { completedStepIds: ['createSkill'], hidden: !hidden },
        { completedStepIds: ['createSkill'], hidden },
      );

      expect(client.track.mock.calls).toEqual([
        ['onboarding_hidden_changed', { hidden }],
      ]);
    },
  );

  it('sends nothing when the saved state equals the previous state', () => {
    const state = { completedStepIds: ['createSkill'], hidden: true };

    trackOnboardingChanges(state, { ...state });

    expect(client.track).not.toHaveBeenCalled();
  });
});
