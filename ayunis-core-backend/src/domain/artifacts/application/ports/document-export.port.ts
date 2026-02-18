export abstract class DocumentExportPort {
  abstract exportToDocx(html: string): Promise<Buffer>;
  abstract exportToPdf(html: string): Promise<Buffer>;
}
