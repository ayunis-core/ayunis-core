import { useSuperAdminCrawlDomainsControllerList } from '@ayunis/api-client';
import type { CrawlDomainGrantResponseDto } from '@ayunis/api-client';

export function useSuperAdminCrawlDomains(orgId: string) {
  const { data, isLoading, isError } =
    useSuperAdminCrawlDomainsControllerList(orgId);

  const domains: CrawlDomainGrantResponseDto[] = data ?? [];

  return { domains, isLoading, isError };
}
