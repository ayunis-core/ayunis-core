import { Injectable } from '@nestjs/common';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { SuperAdminUserListItem } from 'src/iam/users/domain/super-admin-user-list-item';
import {
  PaginatedSuperAdminUsersListResponseDto,
  SuperAdminUserListItemResponseDto,
} from 'src/iam/users/presenters/http/dtos/super-admin-user-list-item-response.dto';
import { UserResponseDtoMapper } from './user-response-dto.mapper';

@Injectable()
export class SuperAdminUserListItemResponseDtoMapper {
  constructor(private readonly userResponseDtoMapper: UserResponseDtoMapper) {}

  toDto(item: SuperAdminUserListItem): SuperAdminUserListItemResponseDto {
    return {
      ...this.userResponseDtoMapper.toDto(item.user),
      orgName: item.orgName,
    };
  }

  toPaginatedDto(
    page: Paginated<SuperAdminUserListItem>,
  ): PaginatedSuperAdminUsersListResponseDto {
    return {
      data: page.data.map((item) => this.toDto(item)),
      pagination: {
        limit: page.limit,
        offset: page.offset,
        total: page.total,
      },
    };
  }
}
