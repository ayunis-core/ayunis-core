import { AuthenticationModule } from 'src/iam/authentication/authentication.module';
import { StartAuthenticatedSessionUseCase } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';

describe(AuthenticationModule.name, () => {
  it('exports the shared MFA-aware session boundary', () => {
    const module = AuthenticationModule.register();

    expect(module.providers).toContain(StartAuthenticatedSessionUseCase);
    expect(module.exports).toContain(StartAuthenticatedSessionUseCase);
  });
});
