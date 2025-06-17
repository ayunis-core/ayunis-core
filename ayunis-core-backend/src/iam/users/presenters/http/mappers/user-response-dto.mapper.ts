import { Injectable } from '@nestjs/common';
import {
  UserResponseDto,
  UsersListResponseDto,
} from '../dtos/user-response.dto';
import { User } from '../../../domain/user.entity';

@Injectable()
export class UserResponseDtoMapper {
  toDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      createdAt: user.createdAt,
    };
  }

  toListDto(users: User[]): UsersListResponseDto {
    return {
      users: users.map((user) => this.toDto(user)),
    };
  }
}
