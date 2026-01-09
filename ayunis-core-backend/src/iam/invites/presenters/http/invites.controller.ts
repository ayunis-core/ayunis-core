import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import {
  CurrentUser,
  UserProperty,
} from '../../../authentication/application/decorators/current-user.decorator';

// Import DTOs
import { CreateInviteDto } from './dtos/create-invite.dto';
import { AcceptInviteDto } from './dtos/accept-invite.dto';
import {
  InviteResponseDto,
  InviteDetailResponseDto,
  AcceptInviteResponseDto,
} from './dtos/invite-response.dto';
import { CreateBulkInvitesDto } from './dtos/create-bulk-invites.dto';
import { CreateBulkInvitesResponseDto } from './dtos/create-bulk-invites-response.dto';

// Import Use Cases
import { CreateInviteUseCase } from '../../application/use-cases/create-invite/create-invite.use-case';
import { CreateBulkInvitesUseCase } from '../../application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { AcceptInviteUseCase } from '../../application/use-cases/accept-invite/accept-invite.use-case';
import { DeleteInviteUseCase } from '../../application/use-cases/delete-invite/delete-invite.use-case';
import { GetInvitesByOrgUseCase } from '../../application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInviteByTokenUseCase } from '../../application/use-cases/get-invite-by-token/get-invite-by-token.use-case';

// Import Commands and Queries
import { CreateInviteCommand } from '../../application/use-cases/create-invite/create-invite.command';
import { CreateBulkInvitesCommand } from '../../application/use-cases/create-bulk-invites/create-bulk-invites.command';
import { AcceptInviteCommand } from '../../application/use-cases/accept-invite/accept-invite.command';
import { DeleteInviteCommand } from '../../application/use-cases/delete-invite/delete-invite.command';
import { GetInvitesByOrgQuery } from '../../application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetInviteByTokenQuery } from '../../application/use-cases/get-invite-by-token/get-invite-by-token.query';

// Import Mappers
import { InviteResponseMapper } from './mappers/invite-response.mapper';
import { Public } from 'src/common/guards/public.guard';
import { RateLimit } from 'src/iam/authorization/application/decorators/rate-limit.decorator';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendInvitationEmailCommand } from '../../application/use-cases/send-invitation-email/send-invitation-email.command';
import { ConfigService } from '@nestjs/config';
import { SendInvitationEmailUseCase } from '../../application/use-cases/send-invitation-email/send-invitation-email.use-case';
import { CreateInviteResponseDto } from './dtos/create-invite-response.dto';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  private readonly logger = new Logger(InvitesController.name);

  constructor(
    private readonly createInviteUseCase: CreateInviteUseCase,
    private readonly createBulkInvitesUseCase: CreateBulkInvitesUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly deleteInviteUseCase: DeleteInviteUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly getInviteByTokenUseCase: GetInviteByTokenUseCase,
    private readonly inviteResponseMapper: InviteResponseMapper,
    private readonly configService: ConfigService,
    private readonly sendInvitationEmailUseCase: SendInvitationEmailUseCase,
  ) {}

  @Post()
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 }) // 10 invites per 15 minutes
  @ApiOperation({
    summary: 'Create a new invite',
    description:
      'Send an invitation to a user to join an organization with a specific role',
  })
  @ApiBody({ type: CreateInviteDto })
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'The invite has been successfully created',
    type: CreateInviteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid invite data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() createInviteDto: CreateInviteDto,
  ): Promise<CreateInviteResponseDto> {
    this.logger.log('create', {
      userId,
      email: createInviteDto.email,
      orgId,
      role: createInviteDto.role,
    });

    const { invite, token } = await this.createInviteUseCase.execute(
      new CreateInviteCommand({
        email: createInviteDto.email,
        orgId,
        role: createInviteDto.role,
        userId,
      }),
    );
    // Build invitation link
    const frontendBaseUrl = this.configService.get<string>(
      'app.frontend.baseUrl',
    );
    const inviteAcceptEndpoint = this.configService.get<string>(
      'app.frontend.inviteAcceptEndpoint',
    );
    const inviteAcceptUrl = `${frontendBaseUrl}${inviteAcceptEndpoint}?token=${token}`;

    // Send invitation email if email configuration is available
    const hasEmailConfig = this.configService.get<boolean>('emails.hasConfig');
    if (hasEmailConfig) {
      this.logger.debug('Sending invitation email', {
        inviteId: invite.id,
        email: invite.email,
      });

      await this.sendInvitationEmailUseCase.execute(
        new SendInvitationEmailCommand(invite, inviteAcceptUrl),
      );

      this.logger.debug('Invitation email sent successfully', {
        inviteId: invite.id,
        email: invite.email,
      });
      return { url: null };
    } else {
      // Return the invitation URL to the frontend
      this.logger.debug(
        'Email configuration not available, skipping email send',
        {
          inviteId: invite.id,
          email: invite.email,
        },
      );
      return { url: inviteAcceptUrl };
    }
  }

  @Post('bulk')
  @RateLimit({ limit: 100, windowMs: 15 * 60 * 1000 }) // 100 invites per 15 minutes
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create multiple invites in bulk',
    description:
      'Send invitations to multiple users. All rows are validated before any are processed.',
  })
  @ApiBody({ type: CreateBulkInvitesDto })
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'The invites have been processed',
    type: CreateBulkInvitesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more invites',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createBulk(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: CreateBulkInvitesDto,
  ): Promise<CreateBulkInvitesResponseDto> {
    this.logger.log('createBulk', {
      userId,
      orgId,
      inviteCount: dto.invites.length,
    });

    const result = await this.createBulkInvitesUseCase.execute(
      new CreateBulkInvitesCommand({
        invites: dto.invites,
        orgId,
        userId,
      }),
    );

    return result;
  }

  @Get()
  @ApiOperation({
    summary: "Get all invites for current user's organization",
    description:
      'Retrieve all invites for the organization with calculated status and sent date',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all invites for the organization',
    type: [InviteResponseDto],
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getInvites(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<InviteResponseDto[]> {
    this.logger.log('getInvites', { userId, orgId });

    const invites = await this.getInvitesByOrgUseCase.execute(
      new GetInvitesByOrgQuery({ orgId, requestingUserId: userId }),
    );

    return this.inviteResponseMapper.toDtoArray(invites);
  }

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Get a single invite by token',
    description: 'Retrieve invite details including organization name by token',
  })
  @ApiParam({
    name: 'token',
    description: 'Token of the invited user',
    type: 'string',
    example: '1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the invite with organization details',
    type: InviteDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getInviteByToken(
    @Param('token') token: string,
  ): Promise<InviteDetailResponseDto> {
    this.logger.log('getInviteByToken', { token });

    const inviteWithOrg = await this.getInviteByTokenUseCase.execute(
      new GetInviteByTokenQuery(token),
    );

    return this.inviteResponseMapper.toDetailDto(inviteWithOrg);
  }

  @Public()
  @Post('accept')
  @ApiOperation({
    summary: 'Accept an invite',
    description: 'Accept an invitation using the JWT token',
  })
  @ApiBody({ type: AcceptInviteDto })
  @ApiResponse({
    status: 200,
    description: 'The invite has been successfully accepted',
    type: AcceptInviteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid invite token or invite already accepted/expired',
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async acceptInvite(
    @Body() acceptInviteDto: AcceptInviteDto,
  ): Promise<AcceptInviteResponseDto> {
    this.logger.log('acceptInvite', {
      hasToken: !!acceptInviteDto.inviteToken,
    });

    const result = await this.acceptInviteUseCase.execute(
      new AcceptInviteCommand({
        inviteToken: acceptInviteDto.inviteToken,
        userName: acceptInviteDto.userName,
        password: acceptInviteDto.password,
        hasAcceptedMarketing: acceptInviteDto.hasAcceptedMarketing,
      }),
    );

    return this.inviteResponseMapper.toAcceptResponseDto(result);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an invite',
    description:
      'Delete an invitation (only allowed by the user who created it)',
  })
  @ApiParam({
    name: 'id',
    description: 'The UUID of the invite to delete',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'The invite has been successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized to delete this invite',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvite(
    @Param('id', ParseUUIDPipe) inviteId: UUID,
  ): Promise<void> {
    this.logger.log('deleteInvite', { inviteId });

    await this.deleteInviteUseCase.execute(new DeleteInviteCommand(inviteId));
  }
}
