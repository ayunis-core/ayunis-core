import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HelpLink } from './HelpLink';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/help-center', () => ({
  getHelpCenterUrl: (path: string) => `https://help.example/${path}`,
}));

describe(HelpLink.name, () => {
  it('keeps the help label accessible while hiding it on narrow viewports', () => {
    render(<HelpLink path="knowledge-collections/" />);

    const label = screen.getByText('common.helpLink');
    expect(label.tagName).toBe('SPAN');
    expect(label.className).toContain('max-sm:sr-only');
  });
});
