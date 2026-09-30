import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { CreateBulkInvitesCommand } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { CreateBulkInvitesUseCase } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { CreateBulkInvitesResponseDto } from 'src/iam/invites/presenters/http/dtos/create-bulk-invites-response.dto';
import { CreateBulkInvitesDto } from 'src/iam/invites/presenters/http/dtos/create-bulk-invites.dto';
import { GetInvitesQueryParamsDto } from 'src/iam/invites/presenters/http/dtos/get-invites-query-params.dto';
import { PaginatedInvitesListResponseDto } from 'src/iam/invites/presenters/http/dtos/invite-response.dto';
import { InviteResponseMapper } from 'src/iam/invites/presenters/http/mappers/invite-response.mapper';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

@ApiTags('Super Admin Invites')
@Controller('super-admin/orgs/:orgId/invites')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminInvitesController {
  private readonly logger = new Logger(SuperAdminInvitesController.name);

  constructor(
    private readonly createBulkInvites: CreateBulkInvitesUseCase,
    private readonly getInvitesByOrg: GetInvitesByOrgUseCase,
    private readonly inviteResponseMapper: InviteResponseMapper,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List pending invites in an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns pending invites for the selected organization',
    type: PaginatedInvitesListResponseDto,
  })
  async getInvites(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Query() query: GetInvitesQueryParamsDto,
  ): Promise<PaginatedInvitesListResponseDto> {
    const invites = await this.getInvitesByOrg.execute(
      new GetInvitesByOrgQuery({
        orgId,
        requestingUserId: userId,
        onlyOpen: true,
        search: query.search,
        pagination: { limit: query.limit, offset: query.offset },
      }),
    );
    return this.inviteResponseMapper.toPaginatedDto(invites);
  }

  @Post('bulk')
  @RateLimit({ limit: 20, windowMs: 15 * 60 * 1000 })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create multiple invites in an organization',
    description:
      'Create invitations for a selected organization, including team assignments applied when each user joins.',
  })
  @ApiBody({ type: CreateBulkInvitesDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The invites have been processed',
    type: CreateBulkInvitesResponseDto,
  })
  async createBulk(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Param('orgId', ParseUUIDPipe) orgId: UUID,
    @Body() dto: CreateBulkInvitesDto,
  ): Promise<CreateBulkInvitesResponseDto> {
    this.logger.log(
      { userId, orgId, inviteCount: dto.invites.length },
      'Creating bulk invites as super admin',
    );
    return this.createBulkInvites.execute(
      new CreateBulkInvitesCommand({ invites: dto.invites, orgId, userId }),
    );
  }
}
