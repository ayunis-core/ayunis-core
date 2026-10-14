import { Body, Controller, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SetOrgUsageVisibilityUseCase } from 'src/iam/orgs/application/use-cases/set-org-usage-visibility/set-org-usage-visibility.use-case';
import { SetOrgUsageVisibilityRequestDto } from './dtos/set-org-usage-visibility-request.dto';
import { SuperAdminOrgResponseDto } from './dtos/super-admin-org-response.dto';
import { SuperAdminOrgResponseDtoMapper } from './mappers/super-admin-org-response-dto.mapper';

@ApiTags('Super Admin Orgs')
@Controller('super-admin/orgs')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminOrgUsageVisibilityController {
  constructor(
    private readonly setVisibility: SetOrgUsageVisibilityUseCase,
    private readonly mapper: SuperAdminOrgResponseDtoMapper,
  ) {}

  @Patch(':id/usage-visibility')
  @ApiOperation({
    summary: 'Set individual user usage visibility for an organisation',
  })
  @ApiOkResponse({ type: SuperAdminOrgResponseDto })
  @ApiForbiddenResponse({ description: 'Super admin privileges required' })
  async setUsageVisibility(
    @Param('id', ParseUUIDPipe) id: UUID,
    @Body() dto: SetOrgUsageVisibilityRequestDto,
  ): Promise<SuperAdminOrgResponseDto> {
    return this.mapper.toDto(
      await this.setVisibility.execute({
        orgId: id,
        hideIndividualUsage: dto.hideIndividualUsage,
      }),
    );
  }
}
