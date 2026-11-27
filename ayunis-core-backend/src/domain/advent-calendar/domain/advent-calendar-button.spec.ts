import { isAdventCalendarLinkUrl } from './advent-calendar-button';

describe('isAdventCalendarLinkUrl', () => {
  it.each([
    'https://marketplace.ayunis.de/skills',
    'http://example.com/path?q=1',
    '/chat',
    '/marketplace?tab=skills',
  ])('accepts %p', (url) => {
    expect(isAdventCalendarLinkUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:info@example.com',
    'ftp://example.com',
    '//evil.example',
    '/\\evil.example',
    '/\tchat',
    'chat',
    'https://',
    '',
  ])('rejects %p, which is neither http(s) nor an in-app path', (url) => {
    expect(isAdventCalendarLinkUrl(url)).toBe(false);
  });
});
