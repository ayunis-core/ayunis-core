import { Module } from '@nestjs/common';
import { UsersRepository } from './application/ports/users.repository';
import { LocalUsersRepository } from './infrastructure/repositories/local/local-users.repository';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { AuthProvider } from 'src/config/authentication.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRecord } from './infrastructure/repositories/local/schema/user.record';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HashingModule } from '../hashing/hashing.module';
import { JwtModule } from '@nestjs/jwt';
import { EmailsModule } from 'src/common/emails/emails.module';
import { EmailTemplatesModule } from 'src/common/email-templates/email-templates.module';

// Import use cases
import { FindUserByIdUseCase } from './application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUsersByOrgIdUseCase } from './application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user/delete-user.use-case';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role/update-user-role.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user/create-user.use-case';
import { CreateAdminUserUseCase } from './application/use-cases/create-admin-user/create-admin-user.use-case';
import { CreateRegularUserUseCase } from './application/use-cases/create-regular-user/create-regular-user.use-case';
import { ValidateUserUseCase } from './application/use-cases/validate-user/validate-user.use-case';
import { IsValidPasswordUseCase } from './application/use-cases/is-valid-password/is-valid-password.use-case';
import { UpdateUserNameUseCase } from './application/use-cases/update-user-name/update-user-name.use-case';
import { UpdatePasswordUseCase } from './application/use-cases/update-password/update-password.use-case';
import { ConfirmEmailUseCase } from './application/use-cases/confirm-email/confirm-email.use-case';
import { ResendEmailConfirmationUseCase } from './application/use-cases/resend-email-confirmation/resend-email-confirmation.use-case';
import { EmailConfirmationJwtService } from './application/services/email-confirmation-jwt.service';

// Import controllers and mappers
import { UserController } from './presenters/http/user.controller';
import { UserResponseDtoMapper } from './presenters/http/mappers/user-response-dto.mapper';
import { SendConfirmationEmailUseCase } from './application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import { TriggerPasswordResetUseCase } from './application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password/reset-password.use-case';
import { ValidatePasswordResetTokenUseCase } from './application/use-cases/validate-password-reset-token/validate-password-reset-token.use-case';
import { SendPasswordResetEmailUseCase } from './application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { PasswordResetJwtService } from './application/services/password-reset-jwt.service';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindAllUserIdsByOrgIdUseCase } from './application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { AdminTriggerPasswordResetUseCase } from './application/use-cases/admin-trigger-password-reset/admin-trigger-password-reset.use-case';
import { WebhooksModule } from 'src/common/webhooks/webhooks.module';
import { InvitesModule } from '../invites/invites.module';
import { SuperAdminUsersController } from './presenters/http/super-admin-users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRecord]),
    InvitesModule,
    HashingModule,
    EmailsModule,
    EmailTemplatesModule,
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
          expiresIn: configService.get<string>(
            'auth.jwt.emailConfirmationExpiresIn',
            '24h',
          ),
        },
      }),
    }),
  ],
  controllers: [UserController, SuperAdminUsersController],
  providers: [
    {
      provide: UsersRepository,
      useFactory: (
        configService: ConfigService,
        userRepository: Repository<UserRecord>,
      ) => {
        return configService.get('auth.provider') === AuthProvider.CLOUD
          ? new LocalUsersRepository(userRepository) // TODO: Implement cloud users repository
          : new LocalUsersRepository(userRepository);
      },
      inject: [ConfigService, getRepositoryToken(UserRecord)],
    },
    // Use cases
    FindUserByIdUseCase,
    FindUsersByOrgIdUseCase,
    DeleteUserUseCase,
    UpdateUserRoleUseCase,
    CreateUserUseCase,
    CreateAdminUserUseCase,
    CreateRegularUserUseCase,
    ValidateUserUseCase,
    IsValidPasswordUseCase,
    UpdateUserNameUseCase,
    UpdatePasswordUseCase,
    ConfirmEmailUseCase,
    ResendEmailConfirmationUseCase,
    SendConfirmationEmailUseCase,
    TriggerPasswordResetUseCase,
    PasswordResetJwtService,
    SendPasswordResetEmailUseCase,
    ResetPasswordUseCase,
    ValidatePasswordResetTokenUseCase,
    FindUserByEmailUseCase,
    FindAllUserIdsByOrgIdUseCase,
    AdminTriggerPasswordResetUseCase,
    // Services
    EmailConfirmationJwtService,
    // Mappers
    UserResponseDtoMapper,
  ],
  exports: [
    CreateAdminUserUseCase,
    CreateRegularUserUseCase,
    SendConfirmationEmailUseCase,
    ValidateUserUseCase,
    FindUserByIdUseCase,
    FindUsersByOrgIdUseCase,
    IsValidPasswordUseCase,
    EmailConfirmationJwtService,
    FindUserByEmailUseCase,
    FindAllUserIdsByOrgIdUseCase,
    UsersRepository, // Export repository for seeding
  ],
})
export class UsersModule {}
