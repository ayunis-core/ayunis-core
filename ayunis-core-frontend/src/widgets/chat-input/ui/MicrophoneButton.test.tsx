import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MicrophoneButton } from './MicrophoneButton';

const toggles = vi.hoisted(() => ({ voiceEnabled: true }));

vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: (feature: string) =>
    feature === 'voiceEnabled' && toggles.voiceEnabled,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/widgets/onboarding', () => ({
  OnboardingTourTarget: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  TOUR_TARGET: { voiceInput: 'voice-input' },
}));

vi.mock('@/widgets/chat-input/hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    isStarting: false,
    isRecording: false,
    isTranscribing: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    isSupported: true,
  }),
}));

vi.mock('@/widgets/chat-input/api/useTranscribe', () => ({
  useTranscribe: () => ({ transcribe: vi.fn(), isTranscribing: false }),
}));

describe('MicrophoneButton', () => {
  beforeEach(() => {
    toggles.voiceEnabled = true;
  });

  it('offers voice input when voice features are configured', () => {
    render(<MicrophoneButton onTranscriptionComplete={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'chatInput.microphoneTooltip' }),
    ).not.toBeNull();
  });

  it('is hidden when voice features are not configured', () => {
    toggles.voiceEnabled = false;

    render(<MicrophoneButton onTranscriptionComplete={vi.fn()} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
