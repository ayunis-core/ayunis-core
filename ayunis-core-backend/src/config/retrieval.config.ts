import { registerAs } from '@nestjs/config';

export interface RetrievalConfig {
  mistral: {
    apiKey: string | undefined;
    serverUrl: string | undefined;
  };
  processingMaxPdfPages: number;
  ocrBatchPages?: number;
  ocrBatchBytes?: number;
  ocrConcurrency?: number;
}

export default registerAs('retrieval', (): RetrievalConfig => ({
  ocrBatchPages: Number(process.env.OCR_BATCH_MAX_PAGES || 20),
  ocrBatchBytes: Number(process.env.OCR_BATCH_MAX_BYTES || 10 * 1024 * 1024),
  ocrConcurrency: Number(process.env.OCR_MAX_CONCURRENCY || 4),
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
    serverUrl: process.env.MISTRAL_OCR_SERVER_URL,
  },
  // Mistral OCR rejects documents above 1000 pages — enforce the cap
  // before OCR so oversized documents fail fast with a clear error.
  processingMaxPdfPages: parseInt(
    process.env.PROCESSING_MAX_PDF_PAGES || '1000',
    10,
  ),
}));
