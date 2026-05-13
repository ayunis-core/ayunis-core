import {
  Controller,
  Get,
  Patch,
  Body,
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
} from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetBrandingUseCase } from '../../application/use-cases/get-branding/get-branding.use-case';
import { GetBrandingQuery } from '../../application/use-cases/get-branding/get-branding.query';
import { UpdateBrandingUseCase } from '../../application/use-cases/update-branding/update-branding.use-case';
import { UpdateBrandingCommand } from '../../application/use-cases/update-branding/update-branding.command';
import { BrandingResponseDto } from './dtos/branding-response.dto';
import { UpdateBrandingDto } from './dtos/update-branding.dto';

const MAX_FAVICON_SIZE = 512 * 1024;

interface UploadedFaviconFiles {
  favicon?: Express.Multer.File[];
}

@ApiTags('Branding')
@Controller('branding')
export class BrandingController {
  private readonly logger = new Logger(BrandingController.name);

  constructor(
    private readonly getBrandingUseCase: GetBrandingUseCase,
    private readonly updateBrandingUseCase: UpdateBrandingUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current org's branding" })
  @ApiOkResponse({ type: BrandingResponseDto })
  async get(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
  ): Promise<BrandingResponseDto> {
    return this.getBrandingUseCase.execute(new GetBrandingQuery(orgId));
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'favicon', maxCount: 1 }], {
      limits: { fileSize: MAX_FAVICON_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Update the current org's branding" })
  @ApiOkResponse({ type: BrandingResponseDto })
  async update(
    @CurrentUser(UserProperty.ORG_ID) orgId: UUID,
    @Body() dto: UpdateBrandingDto,
    @UploadedFiles() files: UploadedFaviconFiles,
  ): Promise<BrandingResponseDto> {
    const faviconFile = files.favicon?.[0];

    this.logger.debug('Updating branding', {
      orgId,
      hasDisplayName: dto.displayName !== undefined,
      hasFavicon: !!faviconFile,
      removeFavicon: dto.removeFavicon,
      hasPrimaryColor: dto.primaryColor !== undefined,
      resetPrimaryColor: dto.resetPrimaryColor,
    });

    await this.updateBrandingUseCase.execute(
      new UpdateBrandingCommand({
        orgId,
        displayName: dto.displayName,
        faviconBuffer: faviconFile?.buffer,
        faviconMimeType: faviconFile?.mimetype,
        removeFavicon: dto.removeFavicon === 'true',
        primaryColor: dto.primaryColor,
        resetPrimaryColor: dto.resetPrimaryColor === 'true',
      }),
    );

    return this.getBrandingUseCase.execute(new GetBrandingQuery(orgId));
  }
}
