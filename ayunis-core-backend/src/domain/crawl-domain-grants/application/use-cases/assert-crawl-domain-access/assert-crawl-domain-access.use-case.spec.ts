import type { UUID } from 'crypto';
import { AssertCrawlDomainAccessUseCase } from './assert-crawl-domain-access.use-case';
import { AssertCrawlDomainAccessCommand } from './assert-crawl-domain-access.command';
import type { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import { CrawlDomainGrant } from 'src/domain/crawl-domain-grants/domain/crawl-domain-grant.entity';
import { CrawlDomainAccessDeniedError } from '../../crawl-domain-grants.errors';

const ORG_A = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_B = '22222222-2222-2222-2222-222222222222' as UUID;

function repoReturning(
  byDomain: (domain: string) => CrawlDomainGrant | null,
): CrawlDomainGrantRepository {
  return {
    findByDomain: jest.fn(async (domain: string) => byDomain(domain)),
    findAllByOrgId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
}

describe('AssertCrawlDomainAccessUseCase', () => {
  it('allows when no grant exists for the host', async () => {
    const useCase = new AssertCrawlDomainAccessUseCase(
      repoReturning(() => null),
    );
    await expect(
      useCase.execute(
        new AssertCrawlDomainAccessCommand(
          'https://public.example.com/page',
          ORG_A,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('allows when the host is granted to the requesting org', async () => {
    const grant = new CrawlDomainGrant({
      orgId: ORG_A,
      domain: 'intranet.customer.de',
    });
    const useCase = new AssertCrawlDomainAccessUseCase(
      repoReturning(() => grant),
    );
    await expect(
      useCase.execute(
        new AssertCrawlDomainAccessCommand(
          'https://intranet.customer.de/wiki',
          ORG_A,
        ),
      ),
    ).resolves.toBeUndefined();
  });

  it('blocks with a 404 access-denied error when the host is granted to another org', async () => {
    const grant = new CrawlDomainGrant({
      orgId: ORG_A,
      domain: 'intranet.customer.de',
    });
    const useCase = new AssertCrawlDomainAccessUseCase(
      repoReturning(() => grant),
    );
    await expect(
      useCase.execute(
        new AssertCrawlDomainAccessCommand(
          'https://intranet.customer.de/wiki',
          ORG_B,
        ),
      ),
    ).rejects.toBeInstanceOf(CrawlDomainAccessDeniedError);
  });

  it('does not block a different host under the same registrable domain (exact-host match)', async () => {
    const useCase = new AssertCrawlDomainAccessUseCase(
      repoReturning((domain) =>
        domain === 'intranet.customer.de'
          ? new CrawlDomainGrant({
              orgId: ORG_A,
              domain: 'intranet.customer.de',
            })
          : null,
      ),
    );
    await expect(
      useCase.execute(
        new AssertCrawlDomainAccessCommand('https://wiki.customer.de/x', ORG_B),
      ),
    ).resolves.toBeUndefined();
  });

  it('queries the repository with the exact lowercased host (no port)', async () => {
    const repo = repoReturning(() => null);
    const useCase = new AssertCrawlDomainAccessUseCase(repo);
    await useCase.execute(
      new AssertCrawlDomainAccessCommand(
        'https://Intranet.Customer.DE:8443/x',
        ORG_A,
      ),
    );
    expect(repo.findByDomain).toHaveBeenCalledWith('intranet.customer.de');
  });
});
