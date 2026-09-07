import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Markdown from './Markdown';

vi.mock('./Codeblock', () => ({
  default: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

describe('Markdown image rendering', () => {
  it('renders remote images by default', () => {
    render(
      <Markdown>
        {'![Remote diagram](https://tracker.example/image.png)'}
      </Markdown>,
    );

    expect(screen.getByRole('img', { name: 'Remote diagram' })).toBeTruthy();
  });

  it('renders only alt text when image rendering is disabled', () => {
    render(
      <Markdown renderImages={false}>
        {'![Remote diagram](https://tracker.example/image.png)'}
      </Markdown>,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Remote diagram')).toBeTruthy();
  });
});
