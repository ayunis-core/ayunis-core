import { randomUUID } from 'crypto';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  OrgNotFoundError,
  OrgRetrievalFailedError,
} from 'src/iam/orgs/application/orgs.errors';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { OrgAuthenticationStateCacheService } from 'src/iam/orgs/application/services/org-authentication-state-cache.service';
import { AssertCachedOrgActiveUseCase } from './assert-cached-org-active.use-case';

describe('cached organisation authentication', () => {
  const orgId = randomUUID();
  let org: Org;
  let reads: jest.Mock;
  let authoritative: AssertOrgActiveUseCase;
  let cached: AssertCachedOrgActiveUseCase;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(0);
    org = new Org({ id: orgId, name: 'Stadt Musterhausen' });
    reads = jest.fn(async () => org);
    authoritative = new AssertOrgActiveUseCase({ findById: reads } as never);
    cached = new AssertCachedOrgActiveUseCase(
      authoritative,
      new OrgAuthenticationStateCacheService(),
    );
  });
  afterEach(() => jest.useRealTimers());

  it('shares active state across users without extending the fixed expiry', async () => {
    await cached.execute({ orgId, sessionVersion: 0 });
    jest.advanceTimersByTime(29_999);
    await cached.execute({ orgId });
    expect(reads).toHaveBeenCalledTimes(1);
    org = new Org({
      id: orgId,
      name: org.name,
      archived: true,
      sessionVersion: 1,
    });
    jest.advanceTimersByTime(1);
    await expect(cached.execute({ orgId })).rejects.toMatchObject({
      code: 'ORG_NOT_ACTIVE',
    });
  });

  it('keeps login checks authoritative during the cached window', async () => {
    await cached.execute({ orgId });
    org = new Org({ id: orgId, name: org.name, archived: true });
    await expect(authoritative.execute({ orgId })).rejects.toMatchObject({
      statusCode: 401,
    });
    await expect(cached.execute({ orgId })).resolves.toBeUndefined();
  });

  it('rejects deleted organisations at expiry and preserves other tenants', async () => {
    await cached.execute({ orgId });
    reads.mockRejectedValueOnce(new OrgNotFoundError(orgId));
    jest.advanceTimersByTime(30_000);
    await expect(cached.execute({ orgId })).rejects.toMatchObject({
      statusCode: 401,
    });
    await expect(
      cached.execute({ orgId: randomUUID() }),
    ).resolves.toBeUndefined();
  });

  it('rejects old generations after restore while allowing fresh tokens', async () => {
    org = new Org({ id: orgId, name: org.name, sessionVersion: 1 });
    await expect(
      cached.execute({ orgId, sessionVersion: 0 }),
    ).rejects.toMatchObject({ code: 'ORG_SESSION_EXPIRED' });
    await expect(
      cached.execute({ orgId, sessionVersion: 1 }),
    ).resolves.toBeUndefined();
    await expect(
      cached.execute({ orgId, sessionVersion: 0 }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('accepts a fresh post-restore token before the older cache entry expires', async () => {
    await cached.execute({ orgId, sessionVersion: 0 });
    org = new Org({ id: orgId, name: org.name, sessionVersion: 1 });
    await expect(
      cached.execute({ orgId, sessionVersion: 1 }),
    ).resolves.toBeUndefined();
    await expect(
      cached.execute({ orgId, sessionVersion: 0 }),
    ).rejects.toMatchObject({ code: 'ORG_SESSION_EXPIRED' });
  });

  it('shares a generation refresh between concurrent fresh tokens', async () => {
    await cached.execute({ orgId, sessionVersion: 0 });
    org = new Org({ id: orgId, name: org.name, sessionVersion: 1 });
    await Promise.all([
      cached.execute({ orgId, sessionVersion: 1 }),
      cached.execute({ orgId, sessionVersion: 1 }),
    ]);
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it('does not cache database failures or inactive states', async () => {
    reads.mockRejectedValueOnce(
      new OrgRetrievalFailedError('connection failed'),
    );
    await expect(cached.execute({ orgId })).rejects.toMatchObject({
      statusCode: 500,
    });
    org = new Org({ id: orgId, name: org.name, archived: true });
    await expect(cached.execute({ orgId })).rejects.toMatchObject({
      statusCode: 401,
    });
    org = new Org({ id: orgId, name: org.name });
    await expect(cached.execute({ orgId })).resolves.toBeUndefined();
  });

  it('coalesces concurrent database reads', async () => {
    await Promise.all([cached.execute({ orgId }), cached.execute({ orgId })]);
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it('does not extend the stale window for a slow database read', async () => {
    reads.mockImplementationOnce(async () => {
      jest.advanceTimersByTime(30_000);
      return org;
    });
    await cached.execute({ orgId });
    org = new Org({ id: orgId, name: org.name, archived: true });
    await expect(cached.execute({ orgId })).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
