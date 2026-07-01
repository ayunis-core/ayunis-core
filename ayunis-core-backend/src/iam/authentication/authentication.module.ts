import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './application/strategies/jwt.strategy';
import { LocalStrategy } from './application/strategies/local.strategy';
import { ApiKeyStrategy } from './application/strategies/api-key.strategy';
import { AuthenticationController } from './presenters/http/authentication.controller';
import { AuthProvider } from '../../config/authentication.config';
import { LocalAuthenticationRepository } from './infrastructure/repositories/local/local-authentication.repository';
import { AUTHENTICATION_REPOSITORY } from './application/tokens/authentication-repository.token';
import { JwtAuthGuard } from './application/guards/jwt-auth.guard';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { OrgsModule } from '../orgs/orgs.module';
import { UnauthorizedExceptionFilter } from './application/filters/unauthorized-exception.filter';

// Import use cases
import { LoginUseCase } from './application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token/refresh-token.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user/register-user.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user/get-current-user.use-case';
import { MeResponseDtoMapper } from './presenters/http/mappers/me-response-dto.mapper';
import { LegalAcceptancesModule } from '../legal-acceptances/legal-acceptances.module';
import { EmailsModule } from 'src/common/emails/emails.module';
import { EmailTemplatesModule } from 'src/common/email-templates/email-templates.module';
import { HashingModule } from '../hashing/hashing.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TrialsModule } from '../trials/trials.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ClsModule } from 'nestjs-cls';
import { UserContextInterceptor } from './application/interceptors/user-context.interceptor';

export interface AuthenticationConfig {
  provider?: AuthProvider;
}

@Module({})
export class AuthenticationModule {
  static register(options?: AuthenticationConfig): DynamicModule {
    return {
      module: AuthenticationModule,
      imports: this.buildImports(),
      providers: this.buildProviders(options),
      controllers: [AuthenticationController],
      exports: [
        LoginUseCase,
        RefreshTokenUseCase,
        RegisterUserUseCase,
        GetCurrentUserUseCase,
        JwtAuthGuard,
      ],
    };
  }

  private static buildImports(): NonNullable<DynamicModule['imports']> {
    return [
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
      JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          secret: configService.getOrThrow<string>('auth.jwt.secret'),
          signOptions: {
            expiresIn: configService.get<StringValue>(
              'auth.jwt.expiresIn',
              '1h',
            ),
          },
        }),
      }),
      ClsModule.forFeature(),
    ];
  }

  private static buildProviders(
    options?: AuthenticationConfig,
  ): NonNullable<DynamicModule['providers']> {
    return [
      this.authenticationRepositoryProvider(options),
      // Use Cases
      LoginUseCase,
      RefreshTokenUseCase,
      RegisterUserUseCase,
      GetCurrentUserUseCase,
      // Strategies and Guards
      LocalStrategy,
      JwtStrategy,
      ApiKeyStrategy,
      // JwtAuthGuard is a regular provider; IamModule owns the APP_GUARD
      // binding so global guard order stays explicit in one place.
      JwtAuthGuard,
      {
        provide: APP_FILTER,
        useClass: UnauthorizedExceptionFilter,
      },
      {
        provide: APP_INTERCEPTOR,
        useClass: UserContextInterceptor,
      },
      MeResponseDtoMapper,
    ];
  }

  private static authenticationRepositoryProvider(
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
}
