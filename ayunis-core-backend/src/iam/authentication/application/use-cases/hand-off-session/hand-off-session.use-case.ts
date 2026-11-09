import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedAuthenticationError } from 'src/iam/authentication/application/authentication.errors';
import { AuthenticationRepository } from 'src/iam/authentication/application/ports/authentication.repository';
import { LocalPasswordLoginPolicyService } from 'src/iam/authentication/application/services/local-password-login-policy.service';
import { AUTHENTICATION_REPOSITORY } from 'src/iam/authentication/application/tokens/authentication-repository.token';
import { HandOffSessionCommand } from 'src/iam/authentication/application/use-cases/hand-off-session/hand-off-session.command';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { RefreshTokenReuseError } from 'src/iam/sessions/application/sessions.errors';
import { ForkSessionCommand } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.command';
import { ForkSessionUseCase } from 'src/iam/sessions/application/use-cases/fork-session/fork-session.use-case';
import { PrepareSessionRotationCommand } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.command';
import { PrepareSessionRotationUseCase } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.use-case';
import { RevokeSessionFamilyCommand } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.command';
import { RevokeSessionFamilyUseCase } from 'src/iam/sessions/application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';

/**
 * Gives a token client (the Office add-in pane) its own session, authenticated
 * by the browser session of the sign-in dialog. The browser session stays as
 * it is: on Outlook on the web the dialog shares cookies with the web app.
 */
@Injectable()
export class HandOffSessionUseCase {
  private readonly logger = new Logger(HandOffSessionUseCase.name);

  constructor(
    @Inject(AUTHENTICATION_REPOSITORY)
    private readonly authRepository: AuthenticationRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly prepareSessionRotation: PrepareSessionRotationUseCase,
    private readonly forkSessionUseCase: ForkSessionUseCase,
    private readonly revokeSessionFamilyUseCase: RevokeSessionFamilyUseCase,
    private readonly localPasswordLoginPolicy: LocalPasswordLoginPolicyService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAuthenticationError, {
    databaseUnavailable: 'includingExpectedErrors',
  })
  async execute(command: HandOffSessionCommand): Promise<AuthTokens> {
    this.logger.log({ client: command.client }, 'handOffSession');
    try {
      return await this.handOffTransactionally(command);
    } catch (error) {
      // Same theft response as refresh, outside the rolled-back transaction.
      if (error instanceof RefreshTokenReuseError) {
        await this.revokeSessionFamilyUseCase.execute(
          new RevokeSessionFamilyCommand(command.refreshToken),
        );
      }
      throw error;
    }
  }

  @Transactional()
  private async handOffTransactionally(
    command: HandOffSessionCommand,
  ): Promise<AuthTokens> {
    const current = await this.prepareSessionRotation.execute(
      new PrepareSessionRotationCommand(command.refreshToken),
    );
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(current.userId),
    );
    const sessionVersion =
      await this.localPasswordLoginPolicy.assertSessionIssuanceAllowed(
        user.orgId,
        current.authenticationMethod,
      );
    const fork = await this.forkSessionUseCase.execute(
      new ForkSessionCommand(current, command.client),
    );
    const accessToken = await this.authRepository.generateAccessToken(
      new ActiveUser({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        systemRole: user.systemRole,
        orgId: user.orgId,
        name: user.name,
        client: fork.client,
      }),
      sessionVersion,
    );
    return new AuthTokens(accessToken, fork.refreshToken);
  }
}
