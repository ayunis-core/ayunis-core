/**
 * Port for CPU-bound local PDF work (page counting, text-layer extraction).
 * Implementations must run off the event loop — extraction happens in the
 * API process.
 */
export abstract class PdfTextExtractorPort {
  abstract countPages(buffer: Buffer): Promise<number>;
  /** One entry per page; a blank or unrenderable page yields ''. */
  abstract extractPageTexts(buffer: Buffer): Promise<string[]>;
}
