import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChapterConfirmationForm } from './ChapterConfirmationForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@ayunis/ui/components/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
  }) => (
    <input
      {...props}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

describe('ChapterConfirmationForm', () => {
  it('requires the learner confirmation before enabling completion', () => {
    const onConfirm = vi.fn();
    render(
      <ChapterConfirmationForm isSubmitting={false} onConfirm={onConfirm} />,
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'confirmation.watchedVideos',
    });
    const button = screen.getByRole('button', {
      name: 'confirmation.completeChapter',
    });

    expect((checkbox as HTMLInputElement).checked).toBe(false);
    expect(button.hasAttribute('disabled')).toBe(true);

    fireEvent.click(checkbox);
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('disables both controls while submitting', () => {
    render(<ChapterConfirmationForm isSubmitting onConfirm={vi.fn()} />);

    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('keeps the checkbox selected when a failed request becomes retryable', () => {
    const { rerender } = render(
      <ChapterConfirmationForm isSubmitting={false} onConfirm={vi.fn()} />,
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    rerender(<ChapterConfirmationForm isSubmitting onConfirm={vi.fn()} />);
    rerender(
      <ChapterConfirmationForm isSubmitting={false} onConfirm={vi.fn()} />,
    );

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false);
  });
});
