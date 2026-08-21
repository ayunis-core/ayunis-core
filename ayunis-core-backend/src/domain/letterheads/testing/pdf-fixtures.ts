import { PDFDocument } from 'pdf-lib';

export async function createPdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage().drawRectangle({ x: 10, y: 10, width: 100, height: 50 });
  }
  return Buffer.from(await doc.save());
}

/**
 * Applies the encryption real-world letterheads carry — locked against editing,
 * but openable without a password — via MuPDF write options such as
 * `encrypt=aes-256,owner-password=locked`.
 */
export async function encryptPdf(
  buffer: Buffer,
  options: string,
): Promise<Buffer> {
  const mupdf = await import('mupdf');
  const document = mupdf.PDFDocument.openDocument(buffer, 'application/pdf');
  if (!(document instanceof mupdf.PDFDocument)) {
    throw new Error('Fixture is not a PDF document');
  }
  return Buffer.from(document.saveToBuffer(options).asUint8Array());
}
