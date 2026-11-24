import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  createRequire(import.meta.url).resolve('@ayunis/chat/composer.css'),
  'utf8',
);

describe('reduced motion chat input styles', () => {
  it('preserves the new-chat compose position and visibility states', () => {
    const mediaQueryStart = styles.indexOf(
      '@media (prefers-reduced-motion: reduce)',
    );
    const chatInputShellStart = styles.indexOf(
      '.chat-input-shell {',
      mediaQueryStart,
    );
    const reducedMotionStyles = styles.slice(
      mediaQueryStart,
      chatInputShellStart,
    );

    expect(mediaQueryStart).toBeGreaterThanOrEqual(0);
    expect(chatInputShellStart).toBeGreaterThan(mediaQueryStart);
    expect(reducedMotionStyles).not.toMatch(
      /\b(transform|gap|opacity|max-height|margin-top)\s*:/,
    );
  });
});
