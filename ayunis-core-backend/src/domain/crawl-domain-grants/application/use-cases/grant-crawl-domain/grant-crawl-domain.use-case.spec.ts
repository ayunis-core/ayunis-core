import type { UUID } from 'crypto';
import { GrantCrawlDomainUseCase } from './grant-crawl-domain.use-case';
import { GrantCrawlDomainCommand } from './grant-crawl-domain.command';
import type { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import { CrawlDomainGrant } from '../../../domain/crawl-domain-grant.entity';
import {
  CrawlDomainAlreadyAssignedError,
  InvalidCrawlDomainApplicationError,
} from '../../crawl-domain-grants.errors';

const ORG_A = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_B = '22222222-2222-2222-2222-222222222222' as UUID;

function makeRepo(
  existing: CrawlDomainGrant | null,
): CrawlDomainGrantRepository {
  return {
    findByDomain: jest.fn(async () => existing),
    findAllByOrgId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(async (grant: CrawlDomainGrant) => grant),
    delete: jest.fn(),
  };
}

describe('GrantCrawlDomainUseCase', () => {
  it('normalizes the input to a host and creates the grant when the domain is free', async () => {
    const repo = makeRepo(null);
    const useCase = new GrantCrawlDomainUseCase(repo);

    const result = await useCase.execute(
      new GrantCrawlDomainCommand(ORG_A, 'https://Intranet.Customer.DE/wiki'),
    );

    expect(result.domain).toBe('intranet.customer.de');
    expect(result.orgId).toBe(ORG_A);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when the same org re-grants a domain it already owns', async () => {
    const existing = new CrawlDomainGrant({
      orgId: ORG_A,
      domain: 'intranet.customer.de',
    });
    const repo = makeRepo(existing);
    const useCase = new GrantCrawlDomainUseCase(repo);

    const result = await useCase.execute(
      new GrantCrawlDomainCommand(ORG_A, 'intranet.customer.de'),
    );

    expect(result).toBe(existing);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects assigning a domain already held by another org with a 409', async () => {
    const existing = new CrawlDomainGrant({
      orgId: ORG_A,
      domain: 'intranet.customer.de',
    });
    const useCase = new GrantCrawlDomainUseCase(makeRepo(existing));

    await expect(
      useCase.execute(
        new GrantCrawlDomainCommand(ORG_B, 'intranet.customer.de'),
      ),
    ).rejects.toBeInstanceOf(CrawlDomainAlreadyAssignedError);
  });

  it('rejects an unparseable domain with a 400', async () => {
    const useCase = new GrantCrawlDomainUseCase(makeRepo(null));

    await expect(
      useCase.execute(new GrantCrawlDomainCommand(ORG_A, 'not a domain')),
    ).rejects.toBeInstanceOf(InvalidCrawlDomainApplicationError);
  });
});
