// The PDF.js build pdf-parse bundles and loads by default.
declare module 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js' {
  export const PDFJS: {
    verbosity: number;
    VERBOSITY_LEVELS: { errors: number; warnings: number; infos: number };
  };

  export class PDFWorker {
    readonly promise: Promise<void>;
    readonly messageHandler: {
      send(action: 'configure', data: { verbosity: number }): void;
    };
    destroy(): void;
  }
}
