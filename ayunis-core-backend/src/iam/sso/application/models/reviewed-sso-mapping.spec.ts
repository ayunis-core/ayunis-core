import { InvalidSsoConfigurationError } from 'src/iam/sso/application/sso.errors';
import { ReviewedSsoMapping } from 'src/iam/sso/application/models/reviewed-sso-mapping';
import { anOrgSsoConnection } from 'src/iam/sso/application/testing/org-sso-connection.fixtures';

describe(ReviewedSsoMapping.name, () => {
  it('matches the normalized mapping reviewed by the operator', () => {
    const connection = anOrgSsoConnection({
      emailDomain: 'Stadt.Example',
      zitadelOrgId: ' zitadel-org-1 ',
      zitadelIdpId: ' zitadel-idp-1 ',
    });
    const reviewed = new ReviewedSsoMapping(
      ['stadt.example'],
      'zitadel-org-1',
      'zitadel-idp-1',
    );

    expect(reviewed.matches(connection)).toBe(true);
  });

  it('reports malformed reviewed values as invalid configuration', () => {
    const reviewed = new ReviewedSsoMapping(['not-a-domain'], 'zitadel-org-1');

    expect(() => reviewed.matches(anOrgSsoConnection())).toThrow(
      InvalidSsoConfigurationError,
    );
  });
});
