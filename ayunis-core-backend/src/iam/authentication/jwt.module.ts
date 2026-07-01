import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JWT_SECRET } from './application/tokens/jwt-secret.token';

/**
 * Provides and exports the JWT secret value, read from `auth.jwt.secret`
 * exactly once. Kept as its own module so `JwtModule.registerAsync` can inject
 * the value via its own `imports` — a dynamic module cannot see providers
 * declared on the module that imports it.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: JWT_SECRET,
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow<string>('auth.jwt.secret'),
      inject: [ConfigService],
    },
  ],
  exports: [JWT_SECRET],
})
class JwtSecretModule {}

/**
 * Single source of truth for the JWT signing/verification secret across the
 * IAM area. `auth.jwt.secret` is read in exactly one place (`JwtSecretModule`)
 * and exposed both to `@nestjs/jwt`'s `JwtModule` — used by every
 * token-issuing service (`EmailConfirmationJwtService`,
 * `PasswordResetJwtService`, `InviteJwtService`, `LocalAuthenticationRepository`)
 * — and via the `JWT_SECRET` token consumed by the passport `JwtStrategy`.
 *
 * No module-level `signOptions.expiresIn` default is configured here: each
 * token-issuing service passes its own `expiresIn` per `sign()` call, so
 * token expiries stay explicit at the call site.
 */
@Module({
  imports: [
    JwtSecretModule,
    JwtModule.registerAsync({
      imports: [JwtSecretModule],
      inject: [JWT_SECRET],
      useFactory: (secret: string) => ({ secret }),
    }),
  ],
  exports: [JwtModule, JwtSecretModule],
})
export class JwtConfigModule {}
