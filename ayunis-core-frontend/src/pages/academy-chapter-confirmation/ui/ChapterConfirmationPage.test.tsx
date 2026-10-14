import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AcademyChapterResponseDto,
  AcademyProgressResponseDto,
} from '@/shared/api';
import ChapterConfirmationPage from './ChapterConfirmationPage';

const { useAcademyProgress } = vi.hoisted(() => ({
  useAcademyProgress: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/layouts/app-layout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/layouts/content-area-layout/ui/ContentAreaLayout', () => ({
  default: ({ contentArea }: { contentArea: ReactNode }) => <>{contentArea}</>,
}));
vi.mock('@/widgets/content-area-header/ui/ContentAreaHeader', () => ({
  default: () => null,
}));
vi.mock('@/features/academy', () => ({ useAcademyProgress }));
vi.mock('@/pages/academy-chapter-confirmation/api/useConfirmChapter', () => ({
  useConfirmChapter: () => ({ confirmChapter: vi.fn(), isSubmitting: false }),
}));
vi.mock('@ayunis/ui/components/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

const chapter = {
  id: 'chapter',
  title: 'KI-Grundlagen',
  courseModules: [{ id: 'module', title: 'Video 1', position: 0 }],
} as AcademyChapterResponseDto;

function progressWith(visibleSeconds: number): AcademyProgressResponseDto {
  return {
    chapters: [],
    academyCompletedAt: null,
    academyCompletionExpiresAt: null,
    courseModules: [{ courseModuleId: 'module', visibleSeconds }],
    minimumModuleSeconds: 60,
  };
}

function submitAfterChecking() {
  render(<ChapterConfirmationPage chapter={chapter} />);
  fireEvent.click(screen.getByRole('checkbox'));
  return screen.getByRole('button');
}

describe('ChapterConfirmationPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('blocks completion while progress is loading', () => {
    useAcademyProgress.mockReturnValue({
      progress: undefined,
      isLoading: true,
    });

    expect(submitAfterChecking().hasAttribute('disabled')).toBe(true);
  });

  it('blocks completion and names modules below the minimum', () => {
    useAcademyProgress.mockReturnValue({
      progress: progressWith(10),
      isLoading: false,
    });

    expect(submitAfterChecking().hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('listitem').textContent).toBe('Video 1');
  });

  it('allows completion once every module reached the minimum', () => {
    useAcademyProgress.mockReturnValue({
      progress: progressWith(60),
      isLoading: false,
    });

    expect(submitAfterChecking().hasAttribute('disabled')).toBe(false);
  });

  it('allows retrying a confirmation the server will replay after page time was reset', () => {
    useAcademyProgress.mockReturnValue({
      progress: {
        ...progressWith(0),
        courseModules: [],
        chapters: [
          {
            chapterId: 'chapter',
            confirmed: true,
            confirmationValid: true,
            confirmedAt: new Date().toISOString(),
            replayable: true,
          },
        ],
      },
      isLoading: false,
    });

    expect(submitAfterChecking().hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('leaves the decision to the server when progress failed to load', () => {
    useAcademyProgress.mockReturnValue({
      progress: undefined,
      isLoading: false,
    });

    expect(submitAfterChecking().hasAttribute('disabled')).toBe(false);
  });
});
