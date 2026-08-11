import { SsoConnectionConflictError } from 'src/iam/sso/application/sso.errors';

describe(SsoConnectionConflictError.name, () => {
  it('describes an organization conflict without implying another owner', () => {
    expect(new SsoConnectionConflictError('orgId').message).toBe(
      'Organization already has an SSO connection',
    );
  });
});
