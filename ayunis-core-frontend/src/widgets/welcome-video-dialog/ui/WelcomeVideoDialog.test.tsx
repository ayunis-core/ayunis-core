import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeVideoDialog from './WelcomeVideoDialog';

const { markSeen, useWelcomeVideoMock } = vi.hoisted(() => ({
  markSeen: vi.fn(),
  useWelcomeVideoMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../api/useWelcomeVideo', () => ({
  useWelcomeVideo: useWelcomeVideoMock,
}));

vi.mock('@/shared/ui/shadcn/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <>{children}</> : null,
  DialogContent: ({
    children,
    showCloseButton,
  }: {
    children: ReactNode;
    showCloseButton?: boolean;
  }) => (
    <div
      data-testid="dialog-content"
      data-show-close-button={String(showCloseButton)}
    >
      {children}
    </div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe('WelcomeVideoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markSeen.mockResolvedValue(undefined);
    useWelcomeVideoMock.mockReturnValue({
      seen: false,
      isLoading: false,
      isSaving: false,
      markSeen,
    });
  });

  it('plays the self-hosted welcome video without loading Loom', () => {
    const { container } = render(<WelcomeVideoDialog />);

    const video = screen.getByLabelText('title');
    expect(video.tagName).toBe('VIDEO');
    expect(video.getAttribute('src')).toBe('/videos/welcome-v1.mp4');
    expect(video.getAttribute('preload')).toBe('metadata');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.querySelector('track')?.getAttribute('src')).toBe(
      '/videos/welcome-v1.de.vtt',
    );
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('stays open when marking the video as seen fails', async () => {
    markSeen.mockRejectedValue(new Error('offline'));
    render(<WelcomeVideoDialog />);

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

    await waitFor(() => expect(markSeen).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('title')).not.toBeNull();
  });

  it('keeps actions reachable in short viewports', () => {
    const { container } = render(<WelcomeVideoDialog />);
    const scrollContainer = container.querySelector(
      '[data-slot="welcome-video-dialog-body"]',
    );

    expect(scrollContainer?.className).toContain('max-h-[calc(90vh-2rem)]');
    expect(scrollContainer?.className).toContain('overflow-y-auto');
  });

  it('blocks all dismissal controls while saving', () => {
    useWelcomeVideoMock.mockReturnValue({
      seen: false,
      isLoading: false,
      isSaving: true,
      markSeen,
    });
    render(<WelcomeVideoDialog />);

    expect(
      screen.getByRole('button', { name: 'dismiss' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByTestId('dialog-content')
        .getAttribute('data-show-close-button'),
    ).toBe('false');
  });
});
