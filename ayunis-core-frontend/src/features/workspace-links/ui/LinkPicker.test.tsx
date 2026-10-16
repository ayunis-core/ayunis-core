import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LinkableSection } from '@/features/workspace-links/model/types';
import { LinkPicker } from './LinkPicker';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count === undefined ? key : `${key}:${values.count}`,
  }),
}));

const owner = { type: 'personal' as const, id: 'lena', name: 'Lena' };
const sections: LinkableSection[] = [
  {
    group: 'own',
    items: [
      { id: 'protokoll', name: 'Protokoll', description: 'Besprechung', owner },
    ],
  },
  {
    group: 'org',
    items: [{ id: 'datenschutz', name: 'Datenschutz', description: '', owner }],
  },
];

function renderPicker(overrides: Partial<Parameters<typeof LinkPicker>[0]>) {
  const onLink = vi.fn();
  render(
    <LinkPicker
      sections={sections}
      isLoading={false}
      isLinking={false}
      searchLabel="search"
      allLinkedDescription="all linked"
      onCancel={vi.fn()}
      onLink={onLink}
      {...overrides}
    />,
  );
  return { onLink };
}

function submitButton() {
  return screen.getByTestId<HTMLButtonElement>('link-picker-submit');
}

describe('LinkPicker', () => {
  afterEach(cleanup);

  it('links the selected items once something is picked', () => {
    const { onLink } = renderPicker({});

    expect(screen.getByText('links.picker.groups.own')).toBeTruthy();
    expect(screen.getByText('links.picker.groups.org')).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toBe('links.picker.link');

    fireEvent.click(screen.getByLabelText(/Protokoll/));
    fireEvent.click(screen.getByLabelText(/Datenschutz/));
    expect(submitButton().textContent).toBe('links.picker.linkCount:2');

    fireEvent.click(submitButton());
    expect(onLink).toHaveBeenCalledWith(['protokoll', 'datenschutz']);
  });

  it('filters on name and description and says when nothing matches', () => {
    renderPicker({});
    const search = screen.getByTestId('link-picker-search');

    fireEvent.change(search, { target: { value: 'besprech' } });
    expect(screen.getByText('Protokoll')).toBeTruthy();
    expect(screen.queryByText('Datenschutz')).toBeNull();

    fireEvent.change(search, { target: { value: 'gibt es nicht' } });
    expect(screen.getByText('links.picker.noResults')).toBeTruthy();
  });

  it('says everything is linked when nothing is left to pick', () => {
    renderPicker({ sections: [] });

    expect(screen.getByTestId('link-picker-all-linked').textContent).toContain(
      'all linked',
    );
    expect(submitButton().disabled).toBe(true);
  });
});
