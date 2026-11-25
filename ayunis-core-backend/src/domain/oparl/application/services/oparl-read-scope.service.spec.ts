import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { OparlReadScopeService } from './oparl-read-scope.service';

const ORG = '11111111-1111-4111-8111-111111111111' as UUID;
const LINKED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as UUID;
const ALSO_LINKED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as UUID;
const NOT_LINKED = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' as UUID;

describe('OparlReadScopeService', () => {
  function service(orgId: UUID | null = ORG) {
    const links = {
      findLinked: jest.fn((org: UUID) =>
        Promise.resolve(
          org === ORG ? [{ id: LINKED }, { id: ALSO_LINKED }] : [],
        ),
      ),
    };
    return new OparlReadScopeService(
      links as never,
      {
        get: (key: string) =>
          key === 'orgId' ? (orgId ?? undefined) : undefined,
      } as never,
    );
  }

  it("reads the current org's linked bodies", async () => {
    expect(await service().resolve()).toEqual({
      bodyIds: [LINKED, ALSO_LINKED],
    });
  });

  it('keeps only linked bodies of a body filter, so one naming unlinked bodies only reads nothing', async () => {
    expect(await service().resolve([NOT_LINKED, LINKED])).toEqual({
      bodyIds: [LINKED],
    });
    expect(await service().resolve([NOT_LINKED])).toEqual({ bodyIds: [] });
  });

  it('reads nothing for an org that linked no bodies, whatever the filter names', async () => {
    const otherOrg = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' as UUID;

    expect(await service(otherOrg).resolve([LINKED])).toEqual({ bodyIds: [] });
  });

  it('refuses without an org in the context', async () => {
    await expect(service(null).resolve()).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});
