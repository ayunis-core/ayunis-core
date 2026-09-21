import type { UUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type {
  ContextService,
  MyClsStore,
} from 'src/common/context/services/context.service';
import {
  getRequiredOrgId,
  getRequiredUserContext,
} from 'src/common/context/required-context';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const API_KEY_ID = '33333333-3333-4333-8333-333333333333' as UUID;

function contextWith(store: MyClsStore): ContextService {
  return {
    get: (key: keyof MyClsStore) => store[key],
  } as unknown as ContextService;
}

describe('getRequiredUserContext', () => {
  it('returns the user and organization ids when both are present', () => {
    const context = contextWith({ userId: USER_ID, orgId: ORG_ID });

    expect(getRequiredUserContext(context)).toEqual({
      userId: USER_ID,
      orgId: ORG_ID,
    });
  });

  it('throws UnauthorizedAccessError when userId is missing', () => {
    const context = contextWith({ orgId: ORG_ID });

    expect(() => getRequiredUserContext(context)).toThrow(
      UnauthorizedAccessError,
    );
  });

  it('throws UnauthorizedAccessError when orgId is missing', () => {
    const context = contextWith({ userId: USER_ID });

    expect(() => getRequiredUserContext(context)).toThrow(
      UnauthorizedAccessError,
    );
  });

  it('throws UnauthorizedAccessError for an api-key principal', () => {
    const context = contextWith({ apiKeyId: API_KEY_ID, orgId: ORG_ID });

    expect(() => getRequiredUserContext(context)).toThrow(
      UnauthorizedAccessError,
    );
  });
});

describe('getRequiredOrgId', () => {
  it('returns the organization id for a user principal', () => {
    const context = contextWith({ userId: USER_ID, orgId: ORG_ID });

    expect(getRequiredOrgId(context)).toBe(ORG_ID);
  });

  it('returns the organization id for an api-key principal', () => {
    const context = contextWith({ apiKeyId: API_KEY_ID, orgId: ORG_ID });

    expect(getRequiredOrgId(context)).toBe(ORG_ID);
  });

  it('throws UnauthorizedAccessError when orgId is missing', () => {
    const context = contextWith({ userId: USER_ID });

    expect(() => getRequiredOrgId(context)).toThrow(UnauthorizedAccessError);
  });
});
