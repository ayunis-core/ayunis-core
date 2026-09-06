import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenRecord } from './infrastructure/repositories/local/schema/refresh-token.record';
import { LocalRefreshTokensRepository } from './infrastructure/repositories/local/local-refresh-tokens.repository';
import { RefreshTokensRepository } from './application/ports/refresh-tokens.repository';
import { RefreshTokenFactory } from './application/services/refresh-token.factory';
import { CreateSessionUseCase } from './application/use-cases/create-session/create-session.use-case';
import { RotateSessionUseCase } from './application/use-cases/rotate-session/rotate-session.use-case';
import { RevokeSessionFamilyUseCase } from './application/use-cases/revoke-session-family/revoke-session-family.use-case';
import { RevokeAllSessionsForUserUseCase } from './application/use-cases/revoke-all-sessions-for-user/revoke-all-sessions-for-user.use-case';
import { RevokeOtherSessionsForUserUseCase } from './application/use-cases/revoke-other-sessions-for-user/revoke-other-sessions-for-user.use-case';
import { SessionsCleanupTask } from './infrastructure/tasks/sessions-cleanup.task';
import { RevokeSessionsByZitadelSessionUseCase } from 'src/iam/sessions/application/use-cases/revoke-sessions-by-zitadel-session/revoke-sessions-by-zitadel-session.use-case';
import { RevokeSsoSessionsForUserUseCase } from 'src/iam/sessions/application/use-cases/revoke-sso-sessions-for-user/revoke-sso-sessions-for-user.use-case';
import { RevokePasswordSessionsForOrgUseCase } from 'src/iam/sessions/application/use-cases/revoke-password-sessions-for-org/revoke-password-sessions-for-org.use-case';
import { PrepareSessionRotationUseCase } from 'src/iam/sessions/application/use-cases/prepare-session-rotation/prepare-session-rotation.use-case';

/**
 * Owns server-side refresh-token session state. Imports nothing from the users
 * or authentication Nest modules, so both can depend on this one without a
 * cycle. Session persistence may reference their TypeORM records for foreign
 * keys and set-based organization queries.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RefreshTokenRecord])],
  providers: [
    {
      provide: RefreshTokensRepository,
      useClass: LocalRefreshTokensRepository,
    },
    RefreshTokenFactory,
    CreateSessionUseCase,
    PrepareSessionRotationUseCase,
    RotateSessionUseCase,
    RevokeSessionFamilyUseCase,
    RevokeAllSessionsForUserUseCase,
    RevokeOtherSessionsForUserUseCase,
    RevokeSessionsByZitadelSessionUseCase,
    RevokeSsoSessionsForUserUseCase,
    RevokePasswordSessionsForOrgUseCase,
    SessionsCleanupTask,
  ],
  exports: [
    CreateSessionUseCase,
    PrepareSessionRotationUseCase,
    RotateSessionUseCase,
    RevokeSessionFamilyUseCase,
    RevokeAllSessionsForUserUseCase,
    RevokeOtherSessionsForUserUseCase,
    RevokeSessionsByZitadelSessionUseCase,
    RevokeSsoSessionsForUserUseCase,
    RevokePasswordSessionsForOrgUseCase,
  ],
})
export class SessionsModule {}
