import type { UUID } from 'crypto';

export class ApiKeyUsageItem {
  public readonly apiKeyId: UUID;
  public readonly name: string;
  public readonly revokedAt: Date | null;
  public readonly expiresAt: Date | null;
  public readonly inputTokens: number;
  public readonly outputTokens: number;
  public readonly totalTokens: number;
  public readonly requests: number;
  /**
   * Sum of the credits of all priced requests. Null when the key has
   * requests but none of them could be priced, so "unknown" is not
   * reported as zero consumption.
   */
  public readonly credits: number | null;
  public readonly unpricedRequests: number;
  public readonly lastUsedAt: Date | null;

  constructor(params: {
    apiKeyId: UUID;
    name: string;
    revokedAt: Date | null;
    expiresAt: Date | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requests: number;
    credits: number | null;
    unpricedRequests: number;
    lastUsedAt: Date | null;
  }) {
    this.apiKeyId = params.apiKeyId;
    this.name = params.name;
    this.revokedAt = params.revokedAt;
    this.expiresAt = params.expiresAt;
    this.inputTokens = params.inputTokens;
    this.outputTokens = params.outputTokens;
    this.totalTokens = params.totalTokens;
    this.requests = params.requests;
    this.credits = params.credits;
    this.unpricedRequests = params.unpricedRequests;
    this.lastUsedAt = params.lastUsedAt;
  }
}
