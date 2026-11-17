import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  aCapabilityContext,
  createAssembleToolUseCase,
  TEST_ORG_ID,
  TEST_USER_ID,
  toolNames,
} from 'src/domain/runs/testing/run-capability.fixture';
import { AnonymizationExceptionCapability } from './anonymization-exception.capability';

function capability(principal: Record<string, unknown>) {
  return new AnonymizationExceptionCapability(createAssembleToolUseCase(), {
    get: (key: string) => principal[key],
  } as never);
}

const user = (role: UserRole) => ({
  userId: TEST_USER_ID,
  orgId: TEST_ORG_ID,
  role,
  systemRole: SystemRole.CUSTOMER,
});

describe('AnonymizationExceptionCapability', () => {
  it('offers the exception card to an org admin', async () => {
    const contribution = await capability(user(UserRole.ADMIN)).contribute(
      aCapabilityContext(),
    );

    expect(toolNames(contribution)).toEqual([
      ToolType.ADD_ANONYMIZATION_EXCEPTION,
    ]);
  });

  it.each([UserRole.MANAGER, UserRole.USER])(
    'does not offer it to a %s, who may not change the whitelist',
    async (role) => {
      expect(
        await capability(user(role)).contribute(aCapabilityContext()),
      ).toEqual({});
    },
  );

  it('does not offer it without a user, e.g. to an API key', async () => {
    expect(
      await capability({ orgId: TEST_ORG_ID }).contribute(aCapabilityContext()),
    ).toEqual({});
  });
});
