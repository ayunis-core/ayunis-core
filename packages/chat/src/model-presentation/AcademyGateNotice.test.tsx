import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AcademyGateNotice } from './AcademyGateNotice';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('AcademyGateNotice', () => {
  it('shows the navigation action only when the host can fulfill it', () => {
    const onOpenAcademy = vi.fn();
    const { rerender } = render(
      <AcademyGateNotice onOpenAcademy={onOpenAcademy} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onOpenAcademy).toHaveBeenCalledOnce();

    rerender(<AcademyGateNotice />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
