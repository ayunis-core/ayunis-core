import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { CrawlDomainGrant } from '../../domain/crawl-domain-grant.entity';
import { ListOrgCrawlDomainsUseCase } from '../../application/use-cases/list-org-crawl-domains/list-org-crawl-domains.use-case';
import { ListOrgCrawlDomainsQuery } from '../../application/use-cases/list-org-crawl-domains/list-org-crawl-domains.query';
import { GrantCrawlDomainUseCase } from '../../application/use-cases/grant-crawl-domain/grant-crawl-domain.use-case';
import { GrantCrawlDomainCommand } from '../../application/use-cases/grant-crawl-domain/grant-crawl-domain.command';
import { RevokeCrawlDomainUseCase } from '../../application/use-cases/revoke-crawl-domain/revoke-crawl-domain.use-case';
import { RevokeCrawlDomainCommand } from '../../application/use-cases/revoke-crawl-domain/revoke-crawl-domain.command';
import { GrantCrawlDomainRequestDto } from './dtos/grant-crawl-domain.dto';
import { CrawlDomainGrantResponseDto } from './dtos/crawl-domain-grant-response.dto';

@ApiTags('Super Admin Crawl Domains')
@Controller('super-admin/crawl-domains')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminCrawlDomainsController {
  private readonly logger = new Logger(SuperAdminCrawlDomainsController.name);

  constructor(
    private readonly listOrgCrawlDomainsUseCase: ListOrgCrawlDomainsUseCase,
    private readonly grantCrawlDomainUseCase: GrantCrawlDomainUseCase,
    private readonly revokeCrawlDomainUseCase: RevokeCrawlDomainUseCase,
  ) {}

  @Get(':orgId')
  @ApiOperation({
    summary: 'List the crawl domains assigned to an organization',
  })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: [CrawlDomainGrantResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async list(
    @Param('orgId') orgId: UUID,
  ): Promise<CrawlDomainGrantResponseDto[]> {
    this.logger.log('list', { orgId });

    const grants = await this.listOrgCrawlDomainsUseCase.execute(
      new ListOrgCrawlDomainsQuery(orgId),
    );
    return grants.map((grant) => this.toDto(grant));
  }

  @Post(':orgId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a crawl domain to an organization' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiBody({ type: GrantCrawlDomainRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CrawlDomainGrantResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid domain' })
  @ApiConflictResponse({
    description: 'Domain already assigned to another organization',
  })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async grant(
    @Param('orgId') orgId: UUID,
    @Body() dto: GrantCrawlDomainRequestDto,
  ): Promise<CrawlDomainGrantResponseDto> {
    this.logger.log('grant', { orgId, domain: dto.domain });

    const grant = await this.grantCrawlDomainUseCase.execute(
      new GrantCrawlDomainCommand(orgId, dto.domain),
    );
    return this.toDto(grant);
  }

  @Delete(':orgId/:grantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a crawl domain from an organization' })
  @ApiParam({ name: 'orgId', format: 'uuid' })
  @ApiParam({ name: 'grantId', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Crawl domain revoked',
  })
  @ApiNotFoundResponse({ description: 'Crawl domain grant not found' })
  @ApiUnauthorizedResponse({ description: 'Not authorized as super admin' })
  async revoke(
    @Param('orgId') orgId: UUID,
    @Param('grantId') grantId: UUID,
  ): Promise<void> {
    this.logger.log('revoke', { orgId, grantId });

    await this.revokeCrawlDomainUseCase.execute(
      new RevokeCrawlDomainCommand(orgId, grantId),
    );
  }

  private toDto(grant: CrawlDomainGrant): CrawlDomainGrantResponseDto {
    return {
      id: grant.id,
      orgId: grant.orgId,
      domain: grant.domain,
      createdAt: grant.createdAt,
    };
  }
}
