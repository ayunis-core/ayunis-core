import { Injectable } from '@nestjs/common';
import { SuperAdminUserResponseDto } from '../dtos/super-admin-user-response.dto';
import { UserResponseDtoMapper } from './user-response-dto.mapper';
import { User } from '../../../domain/user.entity';

@Injectable()
export class SuperAdminUserResponseDtoMapper {
  constructor(private readonly userResponseDtoMapper: UserResponseDtoMapper) {}

  toDto(user: User): SuperAdminUserResponseDto {
    return {
      ...this.userResponseDtoMapper.toDto(user),
      systemRole: user.systemRole,
    };
  }
}
