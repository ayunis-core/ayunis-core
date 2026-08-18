import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Markdown from './Markdown';
import { PiiMaskProvider } from '@/widgets/markdown/model/pii-mask-context';
import type { PiiMaskEntry } from '@/widgets/markdown/model/pii-mask-context';

const masks: PiiMaskEntry[] = [
  {
    id: '0d4f9c5e-7a36-4b34-9c1b-2f8d6a1e5b3c',
    token: '{{pii:PERSON_NAME_1}}',
    value: 'Max Mustermann',
    category: 'person_name',
    unmasked: false,
  },
];

const unmaskedMasks: PiiMaskEntry[] = [{ ...masks[0], unmasked: true }];

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

  it('renders manually unmasked entries as plain text', () => {
    render(
      <PiiMaskProvider masks={unmaskedMasks}>
        <Markdown>{'Schreib an {{pii:PERSON_NAME_1}} bitte'}</Markdown>
      </PiiMaskProvider>,
    );

    const value = screen.getByText('Max Mustermann');
    expect(value).toBeTruthy();
    expect(value.className).not.toContain('bg-brand/15');
    expect(screen.queryByTestId('pii-mask')).toBeNull();
  });

  it('requests an unmask on click when a handler is provided', () => {
    const onUnmaskRequest = vi.fn();
    render(
      <PiiMaskProvider masks={masks} onUnmaskRequest={onUnmaskRequest}>
        <Markdown>{'Schreib an {{pii:PERSON_NAME_1}} bitte'}</Markdown>
      </PiiMaskProvider>,
    );

    fireEvent.click(screen.getByTestId('pii-mask'));

    expect(onUnmaskRequest).toHaveBeenCalledWith(masks[0]);
  });

  it('is not clickable without an unmask handler', () => {
    render(
      <PiiMaskProvider masks={masks}>
        <Markdown>{'Schreib an {{pii:PERSON_NAME_1}} bitte'}</Markdown>
      </PiiMaskProvider>,
    );

    expect(screen.getByTestId('pii-mask').tagName).toBe('SPAN');
  });
});
