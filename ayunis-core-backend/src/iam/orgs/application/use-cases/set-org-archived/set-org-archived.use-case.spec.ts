jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { SetOrgArchivedUseCase } from './set-org-archived.use-case';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';

const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
describe('SetOrgArchivedUseCase', () => {
  const repository = { updateArchived: jest.fn() };
  const sessions = { execute: jest.fn() };
  const context = { get: jest.fn() };
  const useCase = new SetOrgArchivedUseCase(
    repository as never,
    sessions as never,
    context as never,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    context.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    repository.updateArchived.mockImplementation(
      (_id: UUID, archived: boolean) =>
        Promise.resolve(
          new Org({ id: orgId, name: 'Stadt Musterhausen', archived }),
        ),
    );
  });
  it('archives without losing the organisation and revokes existing sessions', async () => {
    const result = await useCase.execute({ orgId, archived: true });
    expect(result).toMatchObject({
      id: orgId,
      name: 'Stadt Musterhausen',
      archived: true,
    });
    expect(sessions.execute).toHaveBeenCalledWith({ orgId });
  });
  it('restores without reviving sessions', async () => {
    expect(await useCase.execute({ orgId, archived: false })).toMatchObject({
      archived: false,
    });
    expect(sessions.execute).not.toHaveBeenCalled();
  });
  it('rejects a customer before changing any organisation', async () => {
    context.get.mockReturnValue(SystemRole.CUSTOMER);
    await expect(
      useCase.execute({ orgId, archived: true }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.updateArchived).not.toHaveBeenCalled();
  });
});
