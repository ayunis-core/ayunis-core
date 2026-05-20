import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Logger,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { SystemRoles } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindOrgByIdQuery } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.query';
import { UpdateOrgUseCase } from 'src/iam/orgs/application/use-cases/update-org/update-org.use-case';
import { UpdateOrgCommand } from 'src/iam/orgs/application/use-cases/update-org/update-org.command';
import { GetBrandingUseCase } from '../../application/use-cases/get-branding/get-branding.use-case';
import { GetBrandingQuery } from '../../application/use-cases/get-branding/get-branding.query';
import { UpdateBrandingUseCase } from '../../application/use-cases/update-branding/update-branding.use-case';
import { UpdateBrandingCommand } from '../../application/use-cases/update-branding/update-branding.command';
import { BrandingResponseDto } from './dtos/branding-response.dto';
import { SuperAdminUpdateBrandingDto } from './dtos/super-admin-update-branding.dto';

const MAX_FAVICON_SIZE = 512 * 1024;

interface UploadedFaviconFiles {
  favicon?: Express.Multer.File[];
}

@ApiTags('Branding')
@Controller('super-admin/orgs/:id/branding')
@SystemRoles(SystemRole.SUPER_ADMIN)
export class SuperAdminBrandingController {
  private readonly logger = new Logger(SuperAdminBrandingController.name);

  constructor(
    private readonly getBrandingUseCase: GetBrandingUseCase,
    private readonly updateBrandingUseCase: UpdateBrandingUseCase,
    private readonly findOrgByIdUseCase: FindOrgByIdUseCase,
    private readonly updateOrgUseCase: UpdateOrgUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get an organization's branding (super admin)" })
  @ApiOkResponse({ type: BrandingResponseDto })
  @ApiForbiddenResponse({ description: 'The requester is not a super admin.' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  async get(@Param('id') id: UUID): Promise<BrandingResponseDto> {
    return this.getBrandingUseCase.execute(new GetBrandingQuery(id));
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'favicon', maxCount: 1 }], {
      limits: { fileSize: MAX_FAVICON_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Update an organization's branding and name (super admin)",
  })
  @ApiOkResponse({ type: BrandingResponseDto })
  @ApiForbiddenResponse({ description: 'The requester is not a super admin.' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  async update(
    @Param('id') id: UUID,
    @Body() dto: SuperAdminUpdateBrandingDto,
    @UploadedFiles() files: UploadedFaviconFiles,
  ): Promise<BrandingResponseDto> {
    const faviconFile = files.favicon?.[0];

    this.logger.debug('Super admin updating branding', {
      orgId: id,
      hasName: dto.name !== undefined,
      hasDisplayName: dto.displayName !== undefined,
      hasFavicon: !!faviconFile,
      removeFavicon: dto.removeFavicon,
      hasPrimaryColor: dto.primaryColor !== undefined,
      resetPrimaryColor: dto.resetPrimaryColor,
    });

    // Renaming is org identity, not branding — handled by the orgs module.
    if (dto.name !== undefined) {
      const org = await this.findOrgByIdUseCase.execute(
        new FindOrgByIdQuery(id),
      );
      org.name = dto.name.trim();
      await this.updateOrgUseCase.execute(new UpdateOrgCommand(org));
    }

    await this.updateBrandingUseCase.execute(
      new UpdateBrandingCommand({
        orgId: id,
        displayName: dto.displayName,
        faviconBuffer: faviconFile?.buffer,
        faviconMimeType: faviconFile?.mimetype,
        removeFavicon: dto.removeFavicon === 'true',
        primaryColor: dto.primaryColor,
        resetPrimaryColor: dto.resetPrimaryColor === 'true',
      }),
    );

    return this.getBrandingUseCase.execute(new GetBrandingQuery(id));
  }
}
