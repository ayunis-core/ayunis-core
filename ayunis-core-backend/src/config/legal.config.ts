import { registerAs } from '@nestjs/config';

export const legalConfig = registerAs('legal', () => ({
  termsOfService: {
    version: process.env.TERMS_OF_SERVICE_VERSION,
  },
  privacyPolicy: {
    version: process.env.PRIVACY_POLICY_VERSION,
  },
  providers: {
    openai: {
      version: process.env.PROVIDER_OPENAI_LEGAL_VERSION,
    },
    anthropic: {
      version: process.env.PROVIDER_ANTHROPIC_LEGAL_VERSION,
    },
    mistral: {
      version: process.env.PROVIDER_MISTRAL_LEGAL_VERSION,
    },
    synaforce: {
      version: process.env.PROVIDER_SYNAFORCE_LEGAL_VERSION,
    },
  },
}));
