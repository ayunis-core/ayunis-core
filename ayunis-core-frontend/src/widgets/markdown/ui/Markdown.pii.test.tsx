import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Markdown from './Markdown';
import { PiiMaskProvider } from '../model/pii-mask-context';
import type { PiiMaskEntry } from '../model/pii-mask-context';

const masks: PiiMaskEntry[] = [
  {
    token: '{{pii:PERSON_NAME_1}}',
    value: 'Max Mustermann',
    category: 'person_name',
  },
];

describe('Markdown PII mask rendering', () => {
  it('renders the original value highlighted for known tokens', () => {
    render(
      <PiiMaskProvider masks={masks}>
        <Markdown>{'Schreib an {{pii:PERSON_NAME_1}} bitte'}</Markdown>
      </PiiMaskProvider>,
    );

    const value = screen.getByText('Max Mustermann');
    expect(value).toBeTruthy();
    expect(value.className).toContain('bg-brand/15');
    expect(screen.queryByText(/\{\{pii:/)).toBeNull();
  });

  it('resolves tokens nested in markdown formatting', () => {
    render(
      <PiiMaskProvider masks={masks}>
        <Markdown>{'**Wichtig: {{pii:PERSON_NAME_1}}**'}</Markdown>
      </PiiMaskProvider>,
    );

    expect(screen.getByText('Max Mustermann')).toBeTruthy();
  });

  it('renders unknown tokens as literal text', () => {
    render(
      <PiiMaskProvider masks={masks}>
        <Markdown>{'Gruß an {{pii:LOCATION_9}}'}</Markdown>
      </PiiMaskProvider>,
    );

    expect(screen.getByText('{{pii:LOCATION_9}}')).toBeTruthy();
  });

  it('renders tokens without a provider as literal text', () => {
    render(<Markdown>{'Hallo {{pii:PERSON_NAME_1}}'}</Markdown>);

    expect(screen.getByText('{{pii:PERSON_NAME_1}}')).toBeTruthy();
  });

  it('leaves tokens inside inline code untouched', () => {
    render(
      <PiiMaskProvider masks={masks}>
        <Markdown>{'Nutze `{{pii:PERSON_NAME_1}}` als Platzhalter'}</Markdown>
      </PiiMaskProvider>,
    );

    expect(screen.getByText('{{pii:PERSON_NAME_1}}')).toBeTruthy();
    expect(screen.queryByText('Max Mustermann')).toBeNull();
  });
});
