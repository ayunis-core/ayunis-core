import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  'src/widgets/chat-input/ui/chat-input-glow.css',
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
