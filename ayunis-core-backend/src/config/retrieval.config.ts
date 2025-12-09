import { registerAs } from '@nestjs/config';

export interface RetrievalConfig {
  mistral: {
    apiKey: string | undefined;
  };
  docling: {
    serviceUrl: string | undefined;
    apiKey: string | undefined;
  };
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
  }),
);
