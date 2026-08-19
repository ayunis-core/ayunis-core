import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SuperAdminFindAllUsersQuery } from 'src/iam/users/application/use-cases/super-admin-find-all-users/super-admin-find-all-users.query';
import { SuperAdminFindAllUsersUseCase } from 'src/iam/users/application/use-cases/super-admin-find-all-users/super-admin-find-all-users.use-case';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ApiSuperAdminUsersListQueries } from 'src/iam/users/presenters/http/decorators/api-super-admin-users-list.decorator';
import { GetUsersQueryParamsDto } from 'src/iam/users/presenters/http/dtos/get-users-query-params.dto';
import { PaginatedSuperAdminUsersListResponseDto } from 'src/iam/users/presenters/http/dtos/super-admin-user-list-item-response.dto';
import { SuperAdminUserListItemResponseDtoMapper } from 'src/iam/users/presenters/http/mappers/super-admin-user-list-item-response-dto.mapper';

@ApiTags('Super Admin Users')
@Controller('super-admin/users')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUserListController {
  constructor(
    private readonly superAdminFindAllUsersUseCase: SuperAdminFindAllUsersUseCase,
    private readonly responseDtoMapper: SuperAdminUserListItemResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users across all organizations',
    description:
      'Retrieve paginated users across all organizations for platform administration.',
  })
  @ApiSuperAdminUsersListQueries()
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async getAllUsers(
    @Query() queryParams: GetUsersQueryParamsDto,
  ): Promise<PaginatedSuperAdminUsersListResponseDto> {
    const users = await this.superAdminFindAllUsersUseCase.execute(
      new SuperAdminFindAllUsersQuery({
        search: queryParams.search,
        pagination: {
          limit: queryParams.limit,
          offset: queryParams.offset,
        },
      }),
    );

    return this.responseDtoMapper.toPaginatedDto(users);
  }
}
