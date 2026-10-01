import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SetOrgArchivedUseCase } from 'src/iam/orgs/application/use-cases/set-org-archived/set-org-archived.use-case';
import { SuperAdminDeleteOrgUseCase } from 'src/iam/orgs/application/use-cases/super-admin-delete-org/super-admin-delete-org.use-case';
import { SuperAdminOrgResponseDtoMapper } from './mappers/super-admin-org-response-dto.mapper';
import { OrgErrorResponseDto } from './dtos/org-error-response.dto';
import { SuperAdminOrgResponseDto } from './dtos/super-admin-org-response.dto';
import {
  DeleteOrgRequestDto,
  SetOrgArchivedRequestDto,
} from './dtos/org-lifecycle-request.dto';

@ApiTags('Super Admin Orgs')
@Controller('super-admin/orgs')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminOrgLifecycleController {
  constructor(
    private readonly setArchived: SetOrgArchivedUseCase,
    private readonly deletion: SuperAdminDeleteOrgUseCase,
    private readonly mapper: SuperAdminOrgResponseDtoMapper,
  ) {}
  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive or restore an organisation' })
  @ApiBody({ type: SetOrgArchivedRequestDto })
  @ApiOkResponse({ type: SuperAdminOrgResponseDto })
  @ApiNotFoundResponse({ type: OrgErrorResponseDto })
  @ApiInternalServerErrorResponse({ type: OrgErrorResponseDto })
  async setOrgArchived(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() body: SetOrgArchivedRequestDto,
  ): Promise<SuperAdminOrgResponseDto> {
    return this.mapper.toDto(
      await this.setArchived.execute({ orgId: id, archived: body.archived }),
    );
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an organisation and its data' })
  @ApiBody({ type: DeleteOrgRequestDto })
  @ApiNoContentResponse({
    description: 'Organisation, users and stored files deleted',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request or organisation name does not match',
  })
  @ApiNotFoundResponse({ type: OrgErrorResponseDto })
  @ApiConflictResponse({
    type: OrgErrorResponseDto,
    description: 'Organisation has active processing jobs',
  })
  @ApiInternalServerErrorResponse({
    type: OrgErrorResponseDto,
    description: 'Deletion or external cleanup failed',
  })
  async deleteOrg(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() body: DeleteOrgRequestDto,
  ): Promise<void> {
    await this.deletion.execute({
      orgId: id,
      confirmationName: body.confirmationName,
    });
  }
}
