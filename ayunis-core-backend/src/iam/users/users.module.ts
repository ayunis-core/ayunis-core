import { Module } from '@nestjs/common';
import { UsersRepository } from './application/ports/users.repository';
import { LocalUsersRepository } from './infrastructure/repositories/local/local-users.repository';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from 'src/config/authentication.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRecord } from './infrastructure/repositories/local/schema/user.record';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HashingModule } from '../hashing/hashing.module';

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

// Import controllers and mappers
import { UserController } from './presenters/http/user.controller';
import { UserResponseDtoMapper } from './presenters/http/mappers/user-response-dto.mapper';

@Module({
  imports: [TypeOrmModule.forFeature([UserRecord]), HashingModule],
  controllers: [UserController],
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
    // Mappers
    UserResponseDtoMapper,
  ],
  exports: [
    FindUserByIdUseCase,
    FindUsersByOrgIdUseCase,
    DeleteUserUseCase,
    UpdateUserRoleUseCase,
    CreateUserUseCase,
    CreateAdminUserUseCase,
    CreateRegularUserUseCase,
    ValidateUserUseCase,
    IsValidPasswordUseCase,
  ],
})
export class UsersModule {}
