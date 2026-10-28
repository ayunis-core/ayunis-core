import { sniffAllowedImageContentType } from './content-type.util';

describe('sniffAllowedImageContentType', () => {
  it.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])],
    [
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    ],
    ['image/gif', Buffer.from('GIF89a\x01\x00\x01\x00')],
    ['image/webp', Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ')],
  ] as const)('recognises %s by its signature', (contentType, buffer) => {
    expect(sniffAllowedImageContentType(buffer)).toBe(contentType);
  });

  it.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['TIFF', Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00])],
    [
      'a RIFF container that is not WebP',
      Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt '),
    ],
    ['an empty buffer', Buffer.alloc(0)],
  ])('leaves %s unrecognised', (_label, buffer) => {
    expect(sniffAllowedImageContentType(buffer)).toBeUndefined();
  });
});

it('recognises the GIF87a header', () => {
  expect(sniffAllowedImageContentType(Buffer.from('GIF87a'))).toBe('image/gif');
});
it.each([
  Buffer.from([0xff, 0xd8]),
  Buffer.from([0x89, 0x50, 0x4e]),
  Buffer.from('GIF89'),
  Buffer.from('RIFF1234WEB'),
])('does not recognise a truncated signature', (bytes) => {
  expect(sniffAllowedImageContentType(bytes)).toBeUndefined();
});
