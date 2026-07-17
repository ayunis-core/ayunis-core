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

/**
 * Owns server-side refresh-token session state. Imports nothing from the users
 * or authentication modules (the record's `ManyToOne(UserRecord)` is a
 * type-only import), so both of those modules can depend on this one without a
 * cycle.
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
    RotateSessionUseCase,
    RevokeSessionFamilyUseCase,
    RevokeAllSessionsForUserUseCase,
    RevokeOtherSessionsForUserUseCase,
    SessionsCleanupTask,
  ],
  exports: [
    CreateSessionUseCase,
    RotateSessionUseCase,
    RevokeSessionFamilyUseCase,
    RevokeAllSessionsForUserUseCase,
    RevokeOtherSessionsForUserUseCase,
  ],
})
export class SessionsModule {}
