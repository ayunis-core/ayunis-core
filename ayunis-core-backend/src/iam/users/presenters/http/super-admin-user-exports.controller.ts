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
import { ExportUsersUseCase } from 'src/iam/users/application/use-cases/export-users/export-users.use-case';

@ApiTags('Super Admin Users')
@Controller('super-admin/users/export')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminUserExportsController {
  private readonly logger = new Logger(SuperAdminUserExportsController.name);

  constructor(private readonly exportUsersUseCase: ExportUsersUseCase) {}

  @Get('users.csv')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users-export.csv"')
  @ApiOperation({
    summary: 'Export users as CSV',
    description:
      'Export all users, regardless of role, from organizations with a non-cancelled subscription, including subscriptions that start in the future. Each row includes the user role. This endpoint is only accessible to super admins.',
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
    description: 'Internal server error occurred while exporting users',
  })
  async exportUsers(): Promise<string> {
    this.logger.log('exportUsers');

    return this.exportUsersUseCase.execute();
  }
}
