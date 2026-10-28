import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuthenticationModule } from 'src/iam/authentication/authentication.module';
import { LogoutController } from 'src/iam/sso/presenters/http/logout.controller';
import { SsoLoginController } from 'src/iam/sso/presenters/http/sso-login.controller';
import { SsoModule } from 'src/iam/sso/sso.module';

describe(SsoModule.name, () => {
  it('owns its public authentication controllers and imports the shared authentication boundary', () => {
    const authenticationModule = AuthenticationModule.register();
    const module = SsoModule.register(authenticationModule);
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      SsoModule,
    ) as unknown[];

    expect(controllers).toEqual(
      expect.arrayContaining([SsoLoginController, LogoutController]),
    );
    expect(module.imports).toContain(authenticationModule);
  });
});
