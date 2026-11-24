import type { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';

export class SearchWebCommand {
  constructor(
    public readonly query: string,
    public readonly signal?: AbortSignal,
    /** Absent: any domain. */
    public readonly allowedDomains?: AllowedDomains,
  ) {}
}
