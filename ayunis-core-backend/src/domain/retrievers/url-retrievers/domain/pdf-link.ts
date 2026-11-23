export interface PdfLink {
  url: string;
  name: string;
}

export function isPdfLink(url: string): boolean {
  try {
    return decodeURIComponent(new URL(url).pathname)
      .toLowerCase()
      .endsWith('.pdf');
  } catch {
    return false;
  }
}

export function pdfFileName(url: string): string {
  try {
    return (
      decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '') ||
      'document.pdf'
    );
  } catch {
    return 'document.pdf';
  }
}

export const PDF_MIME_TYPE = 'application/pdf';

/**
 * A response is a PDF when the server says so, or when it sends a
 * generic/absent content type but a candidate URL ends in `.pdf` (some hosts
 * serve PDFs as application/octet-stream or with no content type at all).
 * Pass both the requested and the post-redirect URL: a `.pdf` link often
 * redirects to a signed CDN URL whose path no longer carries the extension.
 */
export function isPdfResponse(contentType: string, ...urls: string[]): boolean {
  // `application/x-pdf` is a legacy alias some servers still send.
  if (
    contentType.includes(PDF_MIME_TYPE) ||
    contentType.includes('application/x-pdf')
  ) {
    return true;
  }
  const isGenericType =
    contentType === '' ||
    contentType.includes('application/octet-stream') ||
    contentType.includes('binary/octet-stream');
  return isGenericType && urls.some(hasPdfExtension);
}

function hasPdfExtension(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    // Decode percent-encoding so `/report%2Epdf` is recognized. Falls back to
    // the raw pathname if the encoding is malformed.
    let decoded = pathname;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      // Malformed percent-encoding — check the raw pathname instead.
    }
    return decoded.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}
