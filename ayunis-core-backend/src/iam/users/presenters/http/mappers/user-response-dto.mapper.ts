import { Injectable } from '@nestjs/common';
import {
  UserResponseDto,
  UsersListResponseDto,
  PaginatedUsersListResponseDto,
} from 'src/iam/users/presenters/http/dtos/user-response.dto';
import { User } from 'src/iam/users/domain/user.entity';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class UserResponseDtoMapper {
  toDto(user: User, includeLockStatus = false): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      department: user.department,
      ...(includeLockStatus && { isLocked: user.lockedAt !== null }),
      createdAt: user.createdAt,
    };
  }

  toListDto(users: User[]): UsersListResponseDto {
    return {
      users: users.map((user) => this.toDto(user)),
    };
  }

  toPaginatedDto(
    paginated: Paginated<User>,
    includeLockStatus = false,
  ): PaginatedUsersListResponseDto {
    return {
      data: paginated.data.map((user) => this.toDto(user, includeLockStatus)),
      pagination: {
        limit: paginated.limit,
        offset: paginated.offset,
        total: paginated.total,
      },
    };
  }
}
