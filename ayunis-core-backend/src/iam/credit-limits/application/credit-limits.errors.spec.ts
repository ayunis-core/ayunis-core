import { TeamCreditLimitExceededError } from './credit-limits.errors';

describe('TeamCreditLimitExceededError', () => {
  it('retains consumption internally but omits it from HTTP and streaming error bodies', () => {
    const metadata = {
      teamId: '22222222-2222-4222-8222-222222222222',
      creditsUsed: 1240,
      limit: 1000,
    };
    const error = new TeamCreditLimitExceededError(metadata);
    expect(error.metadata).toEqual(metadata);
    expect(error.toClientResponse()).toEqual({
      code: 'TEAM_CREDIT_LIMIT_EXCEEDED',
      message: 'Your team monthly credit limit has been reached',
      metadata: { teamId: metadata.teamId, limit: 1000 },
    });
    expect(error.toHttpException().getResponse()).toEqual(
      error.toClientResponse(),
    );
  });
});
