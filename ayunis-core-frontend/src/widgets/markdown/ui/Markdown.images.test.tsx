import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
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

  it.each([
    ['de', 'Bild'],
    ['en', 'Image'],
  ])(
    'replaces disabled images with a placeholder even without alt text (%s)',
    async (language, placeholder) => {
      await i18n.changeLanguage(language);
      render(
        <Markdown renderImages={false}>
          {'![img-1.jpeg](img-1.jpeg) ![](https://tracker.example/image.png)'}
        </Markdown>,
      );

      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.queryByText('img-1.jpeg')).toBeNull();
      expect(screen.getAllByText(placeholder)).toHaveLength(2);
    },
  );
});
