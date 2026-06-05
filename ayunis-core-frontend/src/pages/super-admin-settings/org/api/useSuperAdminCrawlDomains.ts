import { useSuperAdminCrawlDomainsControllerList } from '@/shared/api';
import type { CrawlDomainGrantResponseDto } from '@/shared/api';

export function useSuperAdminCrawlDomains(orgId: string) {
  const { data, isLoading, isError } =
    useSuperAdminCrawlDomainsControllerList(orgId);

  const domains: CrawlDomainGrantResponseDto[] = data ?? [];

  return { domains, isLoading, isError };
}
