import {
  AdventCalendarMediaType,
  parseVimeoUrl,
} from './advent-calendar-media';

const video = (videoId: string, hash: string | null = null) => ({
  type: AdventCalendarMediaType.VIMEO,
  videoId,
  hash,
});

describe('parseVimeoUrl', () => {
  it.each([
    ['https://vimeo.com/123456789', video('123456789')],
    [
      'https://vimeo.com/123456789/abc123def0',
      video('123456789', 'abc123def0'),
    ],
    ['https://player.vimeo.com/video/123456789', video('123456789')],
    [
      'https://player.vimeo.com/video/123456789?h=abc123def0',
      video('123456789', 'abc123def0'),
    ],
    ['  https://vimeo.com/42  ', video('42')],
  ])('normalizes %s to its id and hash', (input, expected) => {
    expect(parseVimeoUrl(input)).toEqual(expected);
  });

  it.each([
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- proves plain http is refused
    'http://vimeo.com/123456789',
    'https://www.vimeo.com/123456789',
    'https://vimeo.com.evil.example/123456789',
    'https://vimeo.com/channels/staffpicks/123456789',
    'https://vimeo.com/abc',
    'https://vimeo.com/123456789?share=copy',
    'https://vimeo.com/123456789#t=10',
    'https://vimeo.com:8443/123456789',
    'https://user@vimeo.com/123456789',
    'https://player.vimeo.com/video/123456789?h=abc&autoplay=1',
    'https://player.vimeo.com/video/123456789?h=<script>',
    'https://player.vimeo.com/123456789',
    'https://www.loom.com/share/abc',
    'vimeo.com/123456789',
    '',
  ])('rejects %p', (input) => {
    expect(parseVimeoUrl(input)).toBeNull();
  });
});
