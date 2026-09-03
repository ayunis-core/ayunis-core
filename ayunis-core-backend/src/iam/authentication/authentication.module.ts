import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtConfigModule } from './jwt.module';
import { JwtStrategy } from './application/strategies/jwt.strategy';
import { LocalStrategy } from './application/strategies/local.strategy';
import { ApiKeyStrategy } from './application/strategies/api-key.strategy';
import { AuthenticationController } from './presenters/http/authentication.controller';
import { AuthProvider } from 'src/config/authentication.config';
import { LocalAuthenticationRepository } from './infrastructure/repositories/local/local-authentication.repository';
import { AUTHENTICATION_REPOSITORY } from './application/tokens/authentication-repository.token';
import { JwtAuthGuard } from './application/guards/jwt-auth.guard';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UsersModule } from 'src/iam/users/users.module';
import { OrgsModule } from 'src/iam/orgs/orgs.module';

// Import use cases
import { LoginUseCase } from './application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user/register-user.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user/get-current-user.use-case';
import { MeResponseDtoMapper } from './presenters/http/mappers/me-response-dto.mapper';
import { LegalAcceptancesModule } from 'src/iam/legal-acceptances/legal-acceptances.module';
import { EmailsModule } from 'src/common/emails/emails.module';
import { EmailTemplatesModule } from 'src/common/email-templates/email-templates.module';
import { HashingModule } from 'src/iam/hashing/hashing.module';
import { SubscriptionsModule } from 'src/iam/subscriptions/subscriptions.module';
import { TrialsModule } from 'src/iam/trials/trials.module';
import { ApiKeysModule } from 'src/iam/api-keys/api-keys.module';
import { MfaModule } from 'src/iam/mfa/mfa.module';
import { SessionsModule } from 'src/iam/sessions/sessions.module';
import { ClsModule } from 'nestjs-cls';
import { UserContextInterceptor } from './application/interceptors/user-context.interceptor';
import { MfaLoginController } from './presenters/http/mfa-login.controller';
import { StartAuthenticatedSessionUseCase } from 'src/iam/authentication/application/use-cases/start-authenticated-session/start-authenticated-session.use-case';
import { MfaPendingJwtService } from 'src/iam/authentication/application/services/mfa-pending-jwt.service';

export interface AuthenticationConfig {
  provider?: AuthProvider;
}

const AUTHENTICATION_IMPORTS = [
  PassportModule,
  UsersModule,
  OrgsModule,
  LegalAcceptancesModule,
  EmailsModule,
  EmailTemplatesModule,
  HashingModule,
  SubscriptionsModule,
  TrialsModule,
  ApiKeysModule,
  MfaModule,
  SessionsModule,
  JwtConfigModule,
  ClsModule.forFeature(),
];

// The authentication repository is provider-dependent (local vs cloud), so it
// is built per `register()` call. Everything else is static and hoisted below.
function createAuthenticationRepositoryProvider(
  options?: AuthenticationConfig,
): Provider {
  return {
    provide: AUTHENTICATION_REPOSITORY,
    useFactory: (configService: ConfigService, jwtService: JwtService) => {
      const provider =
        options?.provider ??
        configService.get<AuthProvider>('auth.provider', AuthProvider.LOCAL);

      if (provider === AuthProvider.CLOUD) {
        // FUTURE: Implement cloud authentication repository
        throw new Error('Cloud authentication repository not implemented');
      }

      return new LocalAuthenticationRepository(jwtService, configService);
    },
    inject: [ConfigService, JwtService],
  };
}

const AUTHENTICATION_PROVIDERS: Provider[] = [
  // Use Cases
  LoginUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
  GetCurrentUserUseCase,
  StartAuthenticatedSessionUseCase,
  MfaPendingJwtService,
  // Strategies and Guards
  LocalStrategy,
  JwtStrategy,
  ApiKeyStrategy,
  // JwtAuthGuard is a regular provider; IamModule owns the APP_GUARD
  // binding so global guard order stays explicit in one place.
  JwtAuthGuard,
  {
    provide: APP_INTERCEPTOR,
    useClass: UserContextInterceptor,
  },
  MeResponseDtoMapper,
];

const AUTHENTICATION_EXPORTS = [
  LoginUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
  GetCurrentUserUseCase,
  StartAuthenticatedSessionUseCase,
  JwtAuthGuard,
];

@Module({})
export class AuthenticationModule {
  static register(options?: AuthenticationConfig): DynamicModule {
    return {
      module: AuthenticationModule,
      imports: AUTHENTICATION_IMPORTS,
      providers: [
        createAuthenticationRepositoryProvider(options),
        ...AUTHENTICATION_PROVIDERS,
      ],
      controllers: [AuthenticationController, MfaLoginController],
      exports: AUTHENTICATION_EXPORTS,
    };
  }
}
