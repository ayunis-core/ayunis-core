import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillActiveSwitch } from './SkillActiveSwitch';

vi.mock('@/features/skill-actions/api/useSetSkillActivation', () => ({
  useSetSkillActivation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('SkillActiveSwitch', () => {
  afterEach(cleanup);

  it('shows the switch for skills people may turn off', () => {
    render(<SkillActiveSwitch skillId="skill-1" isActive testId="active" />);

    expect(screen.getByTestId('active')).toBeTruthy();
    expect(screen.queryByTestId('active-always')).toBeNull();
  });

  it('shows "Immer aktiv" instead of the switch for mandatory skills', () => {
    render(
      <SkillActiveSwitch
        skillId="skill-1"
        isActive
        isMandatory
        testId="active"
      />,
    );

    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByTestId('active-always').textContent).toBe(
      'card.alwaysActive',
    );
  });
});
