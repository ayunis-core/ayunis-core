import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Response } from 'express';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireAddon } from 'src/iam/authorization/application/decorators/addon.decorator';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { AddonType } from 'src/iam/addons/domain/value-objects/addon-type.enum';
import {
  CurrentUser,
  UserProperty,
} from 'src/iam/authentication/application/decorators/current-user.decorator';
import { GetAcademyCertificateUseCase } from '../../application/use-cases/get-academy-certificate/get-academy-certificate.use-case';
import { GetAcademyCertificateQuery } from '../../application/use-cases/get-academy-certificate/get-academy-certificate.query';

@ApiTags('Academy')
@Controller('academy/certificate')
@RequireAddon(AddonType.AYUNIS_CORE_ACADEMY)
export class AcademyCertificateController {
  private readonly logger = new Logger(AcademyCertificateController.name);

  constructor(
    private readonly getAcademyCertificateUseCase: GetAcademyCertificateUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  // Each download renders a PDF in headless Chromium — keep bursts cheap
  @RateLimit({ limit: 10, windowMs: 15 * 60 * 1000 })
  @ApiOperation({
    summary: 'Download the academy completion certificate',
    description:
      'Render the KI-Führerschein certificate PDF for the current user. Available once the whole academy has been completed.',
  })
  @ApiResponse({
    status: 200,
    description: 'The certificate PDF',
    content: {
      'application/octet-stream': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'The academy has not been completed' })
  @ApiUnauthorizedResponse({
    description: 'User not authenticated or academy add-on not active',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getCertificate(
    @CurrentUser(UserProperty.ID) userId: UUID,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log('Getting academy certificate');
    const certificate = await this.getAcademyCertificateUseCase.execute(
      new GetAcademyCertificateQuery({ userId }),
    );

    res.set({
      'Content-Type': certificate.mimeType,
      'Content-Disposition': `attachment; filename="${certificate.fileName}"`,
    });

    return new StreamableFile(certificate.buffer);
  }
}
