import type { UUID } from 'crypto';
import type { AllowedDomains } from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';

export class RetrieveUrlCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
    public readonly options?: Record<string, unknown>,
    public readonly privateDestinationPolicy:
      'existing' | 'explicit-grant' = 'existing',
    /** Absent: any domain. */
    public readonly allowedDomains?: AllowedDomains,
  ) {}
}
