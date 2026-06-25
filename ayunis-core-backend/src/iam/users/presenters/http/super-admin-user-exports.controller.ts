import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ExportAdminUsersUseCase } from '../../application/use-cases/export-admin-users/export-admin-users.use-case';

@ApiTags('Super Admin Users')
@Controller('super-admin/users/export')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUserExportsController {
  private readonly logger = new Logger(SuperAdminUserExportsController.name);

  constructor(
    private readonly exportAdminUsersUseCase: ExportAdminUsersUseCase,
  ) {}

  @Get('admins.csv')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="admin-users-export.csv"',
  )
  @ApiOperation({
    summary: 'Export admin users as CSV',
    description:
      'Export all admin users from organizations with a non-cancelled subscription, including subscriptions that start in the future. This endpoint is only accessible to super admins.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV export generated successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or not authorized as super admin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred while exporting admin users',
  })
  async exportAdminUsers(): Promise<string> {
    this.logger.log('exportAdminUsers');

    return this.exportAdminUsersUseCase.execute();
  }
}
