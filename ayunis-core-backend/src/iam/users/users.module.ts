import { Module } from '@nestjs/common';
import { UsersRepository } from './application/ports/users.repository';
import { AdminUsersExportRepository } from './application/ports/admin-users-export.repository';
import { LocalUsersRepository } from './infrastructure/repositories/local/local-users.repository';
import { LocalAdminUsersExportRepository } from './infrastructure/repositories/local/local-admin-users-export.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRecord } from './infrastructure/repositories/local/schema/user.record';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HashingModule } from '../hashing/hashing.module';
import { JwtConfigModule } from '../authentication/jwt.module';
import { EmailsModule } from 'src/common/emails/emails.module';
import { EmailTemplatesModule } from 'src/common/email-templates/email-templates.module';

// Import use cases
import { FindUserByIdUseCase } from './application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUsersByIdsUseCase } from './application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByOrgIdUseCase } from './application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user/delete-user.use-case';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role/update-user-role.use-case';
import { CreateUserUseCase } from './application/use-cases/create-user/create-user.use-case';
import { CreateAdminUserUseCase } from './application/use-cases/create-admin-user/create-admin-user.use-case';
import { CreateRegularUserUseCase } from './application/use-cases/create-regular-user/create-regular-user.use-case';
import { ValidateUserUseCase } from './application/use-cases/validate-user/validate-user.use-case';
import { IsValidPasswordUseCase } from './application/use-cases/is-valid-password/is-valid-password.use-case';
import { UpdateUserNameUseCase } from './application/use-cases/update-user-name/update-user-name.use-case';
import { AdminUpdateUserUseCase } from './application/use-cases/admin-update-user/admin-update-user.use-case';
import { UpdatePasswordUseCase } from './application/use-cases/update-password/update-password.use-case';
import { ConfirmEmailUseCase } from './application/use-cases/confirm-email/confirm-email.use-case';
import { ResendEmailConfirmationUseCase } from './application/use-cases/resend-email-confirmation/resend-email-confirmation.use-case';
import { EmailConfirmationJwtService } from './application/services/email-confirmation-jwt.service';

// Import controllers and mappers
import { UserController } from './presenters/http/user.controller';
import { UserPasswordResetController } from './presenters/http/user-password-reset.controller';
import { AdminUserController } from './presenters/http/admin-user.controller';
import { UserResponseDtoMapper } from './presenters/http/mappers/user-response-dto.mapper';
import { SuperAdminUserResponseDtoMapper } from './presenters/http/mappers/super-admin-user-response-dto.mapper';
import { SendConfirmationEmailUseCase } from './application/use-cases/send-confirmation-email/send-confirmation-email.use-case';
import { TriggerPasswordResetUseCase } from './application/use-cases/trigger-password-reset/trigger-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password/reset-password.use-case';
import { ValidatePasswordResetTokenUseCase } from './application/use-cases/validate-password-reset-token/validate-password-reset-token.use-case';
import { SendPasswordResetEmailUseCase } from './application/use-cases/send-password-reset-email/send-password-reset-email.use-case';
import { PasswordResetJwtService } from './application/services/password-reset-jwt.service';
import { FindUserByEmailUseCase } from './application/use-cases/find-user-by-email/find-user-by-email.use-case';
import { FindAllUserIdsByOrgIdUseCase } from './application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { AdminTriggerPasswordResetUseCase } from './application/use-cases/admin-trigger-password-reset/admin-trigger-password-reset.use-case';
import { SuperAdminTriggerPasswordResetUseCase } from './application/use-cases/super-admin-trigger-password-reset/super-admin-trigger-password-reset.use-case';
import { InvitesModule } from '../invites/invites.module';
import { OrgsModule } from '../orgs/orgs.module';
import { SendSetInitialPasswordEmailUseCase } from './application/use-cases/send-set-initial-password-email/send-set-initial-password-email.use-case';
import { TriggerSetInitialPasswordUseCase } from './application/use-cases/trigger-set-initial-password/trigger-set-initial-password.use-case';
import { SuperAdminUsersController } from './presenters/http/super-admin-users.controller';
import { SuperAdminUserExportsController } from './presenters/http/super-admin-user-exports.controller';
import { SuperAdminManagementController } from './presenters/http/super-admin-management.controller';
import { FindSuperAdminsUseCase } from './application/use-cases/find-super-admins/find-super-admins.use-case';
import { GetOrgAdminsUseCase } from './application/use-cases/get-org-admins/get-org-admins.use-case';
import { PromoteToSuperAdminUseCase } from './application/use-cases/promote-to-super-admin/promote-to-super-admin.use-case';
import { DemoteFromSuperAdminUseCase } from './application/use-cases/demote-from-super-admin/demote-from-super-admin.use-case';
import { ExportAdminUsersUseCase } from './application/use-cases/export-admin-users/export-admin-users.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRecord]),
    InvitesModule,
    OrgsModule,
    HashingModule,
    EmailsModule,
    EmailTemplatesModule,
    JwtConfigModule,
  ],
  controllers: [
    UserController,
    UserPasswordResetController,
    AdminUserController,
    SuperAdminUsersController,
    SuperAdminUserExportsController,
    SuperAdminManagementController,
  ],
  providers: [
    {
      provide: UsersRepository,
      useFactory: (userRepository: Repository<UserRecord>) => {
        // FUTURE: Implement cloud users repository when auth.provider === AuthProvider.CLOUD
        return new LocalUsersRepository(userRepository);
      },
      inject: [getRepositoryToken(UserRecord)],
    },
    {
      provide: AdminUsersExportRepository,
      useClass: LocalAdminUsersExportRepository,
    },
    // Use cases
    FindUserByIdUseCase,
    FindUsersByIdsUseCase,
    FindUsersByOrgIdUseCase,
    DeleteUserUseCase,
    UpdateUserRoleUseCase,
    CreateUserUseCase,
    CreateAdminUserUseCase,
    CreateRegularUserUseCase,
    ValidateUserUseCase,
    IsValidPasswordUseCase,
    UpdateUserNameUseCase,
    AdminUpdateUserUseCase,
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
    SuperAdminTriggerPasswordResetUseCase,
    SendSetInitialPasswordEmailUseCase,
    TriggerSetInitialPasswordUseCase,
    FindSuperAdminsUseCase,
    GetOrgAdminsUseCase,
    PromoteToSuperAdminUseCase,
    DemoteFromSuperAdminUseCase,
    ExportAdminUsersUseCase,
    // Services
    EmailConfirmationJwtService,
    // Mappers
    UserResponseDtoMapper,
    SuperAdminUserResponseDtoMapper,
  ],
  exports: [
    CreateAdminUserUseCase,
    CreateRegularUserUseCase,
    SendConfirmationEmailUseCase,
    ValidateUserUseCase,
    FindUserByIdUseCase,
    FindUsersByIdsUseCase,
    FindUsersByOrgIdUseCase,
    IsValidPasswordUseCase,
    EmailConfirmationJwtService,
    FindUserByEmailUseCase,
    FindAllUserIdsByOrgIdUseCase,
    GetOrgAdminsUseCase,
    UsersRepository, // Export repository for seeding
  ],
})
export class UsersModule {}
