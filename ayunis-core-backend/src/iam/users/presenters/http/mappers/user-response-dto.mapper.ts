import { Injectable } from '@nestjs/common';
import {
  UserResponseDto,
  UsersListResponseDto,
} from '../dtos/user-response.dto';
import { User } from '../../../domain/user.entity';
import { Paginated } from 'src/common/pagination';

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

  toListDto(paginatedUsers: Paginated<User>): UsersListResponseDto {
    return {
      users: paginatedUsers.data.map((user) => this.toDto(user)),
      pagination: {
        limit: paginatedUsers.limit,
        offset: paginatedUsers.offset,
        total: paginatedUsers.total,
      },
    };
  }
}
