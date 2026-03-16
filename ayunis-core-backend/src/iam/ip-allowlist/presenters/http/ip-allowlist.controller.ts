import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';
import { Roles } from '../../../authorization/application/decorators/roles.decorator';
import { UserRole } from '../../../users/domain/value-objects/role.object';
import { GetIpAllowlistUseCase } from '../../application/use-cases/get-ip-allowlist/get-ip-allowlist.use-case';
import { GetIpAllowlistQuery } from '../../application/use-cases/get-ip-allowlist/get-ip-allowlist.query';
import { UpdateIpAllowlistUseCase } from '../../application/use-cases/update-ip-allowlist/update-ip-allowlist.use-case';
import { UpdateIpAllowlistCommand } from '../../application/use-cases/update-ip-allowlist/update-ip-allowlist.command';
import { DeleteIpAllowlistUseCase } from '../../application/use-cases/delete-ip-allowlist/delete-ip-allowlist.use-case';
import { DeleteIpAllowlistCommand } from '../../application/use-cases/delete-ip-allowlist/delete-ip-allowlist.command';
import { UpdateIpAllowlistRequestDto } from './dtos/update-ip-allowlist-request.dto';
import { IpAllowlistResponseDto } from './dtos/ip-allowlist-response.dto';
import { getClientIp } from '../../../../common/util/ip.util';

@ApiTags('ip-allowlist')
@Controller('ip-allowlist')
@ApiExtraModels(IpAllowlistResponseDto)
export class IpAllowlistController {
  private readonly logger = new Logger(IpAllowlistController.name);

  constructor(
    private readonly getIpAllowlistUseCase: GetIpAllowlistUseCase,
    private readonly updateIpAllowlistUseCase: UpdateIpAllowlistUseCase,
    private readonly deleteIpAllowlistUseCase: DeleteIpAllowlistUseCase,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the IP allow list for the current org' })
  @ApiResponse({
    status: 200,
    description: 'Current IP allow list (empty array if none)',
    schema: { $ref: getSchemaPath(IpAllowlistResponseDto) },
  })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<IpAllowlistResponseDto> {
    this.logger.log(`Getting IP allow list for org ${orgId}`);

    const query = new GetIpAllowlistQuery(orgId);
    const allowlist = await this.getIpAllowlistUseCase.execute(query);

    return { cidrs: allowlist?.cidrs ?? [] };
  }

  @Put()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Replace the IP allow list for the current org' })
  @ApiResponse({
    status: 200,
    description: 'Updated IP allow list',
    schema: { $ref: getSchemaPath(IpAllowlistResponseDto) },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid CIDR or admin lockout (requesting IP not in new allowlist)',
  })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdateIpAllowlistRequestDto,
    @Req() req: Request,
  ): Promise<IpAllowlistResponseDto> {
    this.logger.log(`Updating IP allow list for org ${orgId}`);

    const clientIp = getClientIp(req);
    if (!clientIp) {
      throw new BadRequestException('Unable to determine client IP address');
    }

    const command = new UpdateIpAllowlistCommand(orgId, dto.cidrs, clientIp);
    const result = await this.updateIpAllowlistUseCase.execute(command);
    return { cidrs: result.cidrs };
  }

  @Delete()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove the IP allow list (disable IP restriction)',
  })
  @ApiResponse({ status: 204, description: 'IP allow list removed' })
  async remove(@CurrentUser(UserProperty.ORG_ID) orgId: UUID): Promise<void> {
    this.logger.log(`Deleting IP allow list for org ${orgId}`);

    const command = new DeleteIpAllowlistCommand(orgId);
    await this.deleteIpAllowlistUseCase.execute(command);
  }
}
