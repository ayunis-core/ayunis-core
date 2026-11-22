import { pdfVersionFromContent, pdfVersionFromHeaders } from './pdf-version';

const ETAG = '"5f2a-61b"';
const LAST_MODIFIED = 'Tue, 03 Nov 2026 08:15:00 GMT';

describe('pdfVersionFromHeaders', () => {
  it('prefers the ETag over Last-Modified and Content-Length', () => {
    expect(
      pdfVersionFromHeaders({
        etag: ETAG,
        lastModified: LAST_MODIFIED,
        contentLength: '24411',
      }),
    ).toBe(`etag:${ETAG}`);
  });

  it('falls back to Last-Modified without an ETag', () => {
    expect(
      pdfVersionFromHeaders({
        etag: null,
        lastModified: LAST_MODIFIED,
        contentLength: '24411',
      }),
    ).toBe(`last-modified:${LAST_MODIFIED}`);
  });

  it('falls back to Content-Length without ETag and Last-Modified', () => {
    expect(
      pdfVersionFromHeaders({
        etag: ' ',
        lastModified: null,
        contentLength: '24411',
      }),
    ).toBe('content-length:24411');
  });

  it('has no version when the server sends no validator, so the download is hashed', () => {
    expect(
      pdfVersionFromHeaders({
        etag: null,
        lastModified: null,
        contentLength: '0',
      }),
    ).toBeNull();
  });
});

describe('pdfVersionFromContent', () => {
  it('changes with the content and only with the content', () => {
    const v1 = pdfVersionFromContent(Buffer.from('%PDF-1.7 Satzung 2025'));
    expect(pdfVersionFromContent(Buffer.from('%PDF-1.7 Satzung 2025'))).toBe(
      v1,
    );
    expect(
      pdfVersionFromContent(Buffer.from('%PDF-1.7 Satzung 2026')),
    ).not.toBe(v1);
    expect(v1).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
