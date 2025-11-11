import {
  Controller,
  Get,
  Logger,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { FindUsersByOrgIdUseCase } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { UserResponseDtoMapper } from './mappers/user-response-dto.mapper';
import { UsersListResponseDto } from './dtos/user-response.dto';
import { FindUsersByOrgIdQuery } from '../../application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Users')
@Controller('super-admin/users')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUsersController {
  private readonly logger = new Logger(SuperAdminUsersController.name);

  constructor(
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly userResponseDtoMapper: UserResponseDtoMapper,
  ) {}

  @Get(':orgId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users by organization ID',
    description:
      'Retrieve all users that belong to the specified organization. This endpoint is only accessible to super admins.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID to get users for',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved users in the organization',
    type: UsersListResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while retrieving users',
  })
  async getUsersByOrgId(
    @Param('orgId') orgId: UUID,
  ): Promise<UsersListResponseDto> {
    this.logger.log('getUsersByOrgId', { orgId });

    const users = await this.findUsersByOrgIdUseCase.execute(
      new FindUsersByOrgIdQuery(orgId),
    );
    return this.userResponseDtoMapper.toListDto(users);
  }
}
