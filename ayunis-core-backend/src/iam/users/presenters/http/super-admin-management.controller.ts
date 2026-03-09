import {
  Controller,
  Get,
  Delete,
  Post,
  Logger,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { FindSuperAdminsUseCase } from '../../application/use-cases/find-super-admins/find-super-admins.use-case';
import { PromoteToSuperAdminUseCase } from '../../application/use-cases/promote-to-super-admin/promote-to-super-admin.use-case';
import { PromoteToSuperAdminCommand } from '../../application/use-cases/promote-to-super-admin/promote-to-super-admin.command';
import { DemoteFromSuperAdminUseCase } from '../../application/use-cases/demote-from-super-admin/demote-from-super-admin.use-case';
import { DemoteFromSuperAdminCommand } from '../../application/use-cases/demote-from-super-admin/demote-from-super-admin.command';
import { SuperAdminUserResponseDtoMapper } from './mappers/super-admin-user-response-dto.mapper';
import { SuperAdminUserResponseDto } from './dtos/super-admin-user-response.dto';
import { PromoteToSuperAdminDto } from './dtos/promote-to-super-admin.dto';
import { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';

@ApiTags('Super Admin Management')
@Controller('super-admin/super-admins')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminManagementController {
  private readonly logger = new Logger(SuperAdminManagementController.name);

  constructor(
    private readonly findSuperAdminsUseCase: FindSuperAdminsUseCase,
    private readonly promoteToSuperAdminUseCase: PromoteToSuperAdminUseCase,
    private readonly demoteFromSuperAdminUseCase: DemoteFromSuperAdminUseCase,
    private readonly superAdminUserResponseDtoMapper: SuperAdminUserResponseDtoMapper,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all super admins',
    description:
      'Retrieve all users with super admin status. Only accessible to super admins.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of super admins',
    type: [SuperAdminUserResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async listSuperAdmins(): Promise<SuperAdminUserResponseDto[]> {
    this.logger.log('listSuperAdmins');

    const superAdmins = await this.findSuperAdminsUseCase.execute();

    return superAdmins.map((user) =>
      this.superAdminUserResponseDtoMapper.toDto(user),
    );
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Promote a user to super admin',
    description:
      'Promote an existing user to super admin by email address. Idempotent if user is already a super admin.',
  })
  @ApiBody({
    type: PromoteToSuperAdminDto,
    description: 'Email of the user to promote',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User promoted to super admin (or already a super admin)',
    type: SuperAdminUserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User with the given email not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async promoteToSuperAdmin(
    @Body() dto: PromoteToSuperAdminDto,
  ): Promise<SuperAdminUserResponseDto> {
    this.logger.log('promoteToSuperAdmin');

    const user = await this.promoteToSuperAdminUseCase.execute(
      new PromoteToSuperAdminCommand({ email: dto.email }),
    );

    return this.superAdminUserResponseDtoMapper.toDto(user);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove super admin status from a user',
    description:
      'Demote a user from super admin to customer. Cannot demote yourself.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to demote',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Super admin status removed',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiForbiddenResponse({
    description: 'Cannot remove your own super admin status',
  })
  @ApiUnprocessableEntityResponse({
    description: 'User is not a super admin',
  })
  @ApiConflictResponse({
    description: 'Cannot demote the last super admin',
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  async demoteFromSuperAdmin(
    @Param('userId', ParseUUIDPipe) userId: UUID,
    @CurrentUser(UserProperty.ID) requestingUserId: UUID,
  ): Promise<void> {
    this.logger.log(
      `demoteFromSuperAdmin userId=${userId} requestingUserId=${requestingUserId}`,
    );

    await this.demoteFromSuperAdminUseCase.execute(
      new DemoteFromSuperAdminCommand({ userId, requestingUserId }),
    );
  }
}
