import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JwtStrategy } from './application/strategies/jwt.strategy';
import { LocalStrategy } from './application/strategies/local.strategy';
import { AuthenticationController } from './presenters/http/authentication.controller';
import { AuthProvider } from '../../config/authentication.config';
import { LocalAuthenticationRepository } from './infrastructure/repositories/local/local-authentication.repository';
import { AUTHENTICATION_REPOSITORY } from './application/tokens/authentication-repository.token';
import { JwtAuthGuard } from './application/guards/jwt-auth.guard';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
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
import { WebhooksModule } from 'src/common/webhooks/webhooks.module';

export interface AuthenticationConfig {
  provider?: AuthProvider;
}

@Module({})
export class AuthenticationModule {
  static register(options?: AuthenticationConfig): DynamicModule {
    return {
      module: AuthenticationModule,
      imports: [
        PassportModule,
        UsersModule,
        OrgsModule,
        LegalAcceptancesModule,
        EmailsModule,
        EmailTemplatesModule,
        HashingModule,
        SubscriptionsModule,
        WebhooksModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>(
              'auth.jwt.secret',
              'dev-secret-change-in-production',
            ),
            signOptions: {
              expiresIn: configService.get<string>('auth.jwt.expiresIn', '1h'),
            },
          }),
        }),
      ],
      providers: [
        {
          provide: AUTHENTICATION_REPOSITORY,
          useFactory: (
            configService: ConfigService,
            jwtService: JwtService,
          ) => {
            const provider =
              options?.provider ||
              configService.get<AuthProvider>(
                'auth.provider',
                AuthProvider.LOCAL,
              );

            if (provider === AuthProvider.CLOUD) {
              // TODO: Implement cloud authentication repository
              throw new Error(
                'Cloud authentication repository not implemented',
              );
            } else {
              return new LocalAuthenticationRepository(
                jwtService,
                configService,
              );
            }
          },
          inject: [ConfigService, JwtService],
        },
        // Use Cases
        LoginUseCase,
        RefreshTokenUseCase,
        RegisterUserUseCase,
        GetCurrentUserUseCase,
        // Strategies and Guards
        LocalStrategy,
        JwtStrategy,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_FILTER,
          useClass: UnauthorizedExceptionFilter,
        },
        MeResponseDtoMapper,
      ],
      controllers: [AuthenticationController],
      exports: [
        LoginUseCase,
        RefreshTokenUseCase,
        RegisterUserUseCase,
        GetCurrentUserUseCase,
      ],
    };
  }
}
