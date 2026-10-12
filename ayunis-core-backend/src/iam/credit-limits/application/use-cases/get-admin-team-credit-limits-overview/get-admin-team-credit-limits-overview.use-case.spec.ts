import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import { GetAdminTeamCreditLimitsOverviewUseCase } from './get-admin-team-credit-limits-overview.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const stored = [
  {
    teamId: '22222222-2222-2222-2222-222222222222',
    name: 'Finance',
    monthlyCredits: 5000,
    creditsUsed: 1240,
  },
];
describe('GetAdminTeamCreditLimitsOverviewUseCase', () => {
  const overview = { execute: jest.fn().mockResolvedValue(stored) };
  const findOrg = { execute: jest.fn() };
  const context = { get: jest.fn() };
  const useCase = new GetAdminTeamCreditLimitsOverviewUseCase(
    overview as never,
    findOrg as never,
    context as never,
  );
  beforeEach(() => {
    context.get.mockImplementation(getFromUserContext());
  });
  it('omits consumed credits while keeping limits readable for hidden organisations', async () => {
    findOrg.execute.mockResolvedValue({ hideIndividualUsage: true });
    expect(await useCase.execute()).toEqual([
      {
        teamId: stored[0].teamId,
        name: 'Finance',
        monthlyCredits: 5000,
      },
    ]);
  });
  it('keeps consumption available for visible organisations', async () => {
    findOrg.execute.mockResolvedValue({ hideIndividualUsage: false });
    expect(await useCase.execute()).toEqual(stored);
  });
  it('keeps super-admin consumption available', async () => {
    findOrg.execute.mockResolvedValue({ hideIndividualUsage: true });
    context.get.mockImplementation(
      getFromUserContext({ systemRole: SystemRole.SUPER_ADMIN }),
    );
    expect(await useCase.execute()).toEqual(stored);
  });
});
