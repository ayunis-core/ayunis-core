import { AssertOrgActiveUseCase } from './assert-org-active.use-case';
import { OrgNotFoundError } from 'src/iam/orgs/application/orgs.errors';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type { UUID } from 'crypto';
const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
describe('AssertOrgActiveUseCase', () => {
  const repository = { findById: jest.fn() };
  const useCase = new AssertOrgActiveUseCase(repository as never);
  it('rejects credentials belonging to a deleted organisation', async () => {
    repository.findById.mockRejectedValue(new OrgNotFoundError(orgId));
    await expect(
      useCase.execute({ orgId, sessionVersion: 0 }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it('rejects archived organisations', async () => {
    repository.findById.mockResolvedValue(
      new Org({ name: 'Stadt Musterhausen', archived: true }),
    );
    await expect(useCase.execute({ orgId })).rejects.toMatchObject({
      code: 'ORG_NOT_ACTIVE',
      statusCode: 401,
    });
  });
  it('rejects pre-archive access tokens after restore', async () => {
    repository.findById.mockResolvedValue(
      new Org({ name: 'Stadt Musterhausen', sessionVersion: 1 }),
    );
    await expect(
      useCase.execute({ orgId, sessionVersion: 0 }),
    ).rejects.toMatchObject({ code: 'ORG_SESSION_EXPIRED' });
    expect(await useCase.execute({ orgId, sessionVersion: 1 })).toMatchObject({
      sessionVersion: 1,
    });
  });
});
