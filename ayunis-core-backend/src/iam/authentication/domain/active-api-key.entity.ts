import type { UUID } from 'crypto';

export class ActiveApiKey {
  readonly kind = 'apiKey' as const;
  readonly apiKeyId: UUID;
  readonly label: string;
  readonly orgId: UUID;

  constructor(params: { apiKeyId: UUID; label: string; orgId: UUID }) {
    this.apiKeyId = params.apiKeyId;
    this.label = params.label;
    this.orgId = params.orgId;
  }
}
