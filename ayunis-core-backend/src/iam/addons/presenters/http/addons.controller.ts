import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { AddonType } from '../../domain/value-objects/addon-type.enum';
import { ListOrgAddonsUseCase } from '../../application/use-cases/list-org-addons/list-org-addons.use-case';
import { ListOrgAddonsQuery } from '../../application/use-cases/list-org-addons/list-org-addons.query';
import { AddonStatusResponseDto } from './dto/addon-status-response.dto';

@ApiTags('Addons')
@Controller('addons')
export class AddonsController {
  private readonly logger = new Logger(AddonsController.name);

  constructor(private readonly listOrgAddonsUseCase: ListOrgAddonsUseCase) {}

  @Get()
  @ApiOperation({
    summary:
      "List all add-ons with their active state for the current user's organization",
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AddonStatusResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async list(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<AddonStatusResponseDto[]> {
    this.logger.log('list', { orgId });

    const statuses = await this.listOrgAddonsUseCase.execute(
      new ListOrgAddonsQuery(orgId),
    );
    return statuses.map((status) => this.toDto(status));
  }

  private toDto(status: {
    type: AddonType;
    active: boolean;
  }): AddonStatusResponseDto {
    return {
      type: status.type,
      active: status.active,
    };
  }
}
