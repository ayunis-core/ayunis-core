import { registerAs } from '@nestjs/config';

export interface RetrievalConfig {
  mistral: {
    apiKey: string | undefined;
  };
  docling: {
    serviceUrl: string | undefined;
    apiKey: string | undefined;
  };
  chatUploadMaxPdfPages: number;
  chatUploadMaxFileSizeMb: number;
}

export default registerAs(
  'retrieval',
  (): RetrievalConfig => ({
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
    },
    docling: {
      serviceUrl: process.env.DOCLING_SERVICE_URL,
      apiKey: process.env.DOCLING_API_KEY,
    },
    chatUploadMaxPdfPages: parseInt(
      process.env.CHAT_UPLOAD_MAX_PDF_PAGES || '50',
      10,
    ),
    chatUploadMaxFileSizeMb: parseInt(
      process.env.CHAT_UPLOAD_MAX_FILE_SIZE_MB || '5',
      10,
    ),
  }),
);
