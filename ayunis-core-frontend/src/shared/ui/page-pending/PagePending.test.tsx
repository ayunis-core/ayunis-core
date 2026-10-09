import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PagePending } from './PagePending';

const translations: Record<string, string> = {
  'common.pagePending.title': 'Loading page…',
  'common.pagePending.description': 'This may take a moment.',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe(PagePending.name, () => {
  it('tells the user the page is still loading', () => {
    render(<PagePending />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Loading page…');
    expect(status.textContent).toContain('This may take a moment.');
  });
});
