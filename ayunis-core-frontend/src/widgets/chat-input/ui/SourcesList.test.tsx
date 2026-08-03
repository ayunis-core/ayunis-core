import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SourcesList } from './SourcesList';

const LONG_SOURCE_NAME =
  'Benutzungs- und Gebu\u0308hrenordnung fu\u0308r o\u0308ffentliche Einrichtungen.pdf';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe('SourcesList', () => {
  it('renders a source name with combining characters in one text element', () => {
    render(
      <SourcesList
        sources={[
          {
            id: 'source-1',
            name: LONG_SOURCE_NAME,
            type: 'text',
          },
        ]}
        onRemove={() => undefined}
      />,
    );

    const sourceName = screen.getByText(LONG_SOURCE_NAME);

    expect(sourceName.textContent).toBe(LONG_SOURCE_NAME);
    expect(sourceName.getAttribute('data-slot')).not.toBe('badge');
  });
});
