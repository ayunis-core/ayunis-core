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
