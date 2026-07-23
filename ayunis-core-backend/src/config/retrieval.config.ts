import { registerAs } from '@nestjs/config';

export interface RetrievalConfig {
  mistral: {
    apiKey: string | undefined;
  };
  processingMaxPdfPages: number;
}

export default registerAs('retrieval', (): RetrievalConfig => ({
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  // Mistral OCR rejects documents above 1000 pages — enforce the cap
  // before upload so oversized documents fail fast with a clear error.
  processingMaxPdfPages: parseInt(
    process.env.PROCESSING_MAX_PDF_PAGES || '1000',
    10,
  ),
}));
