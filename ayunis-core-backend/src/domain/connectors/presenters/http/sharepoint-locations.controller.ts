import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { ResolveSharePointLocationQuery } from 'src/domain/connectors/application/use-cases/resolve-sharepoint-location/resolve-sharepoint-location.query';
import type { SharePointLocationResolution } from 'src/domain/connectors/application/use-cases/resolve-sharepoint-location/resolve-sharepoint-location.result';
import { ResolveSharePointLocationUseCase } from 'src/domain/connectors/application/use-cases/resolve-sharepoint-location/resolve-sharepoint-location.use-case';
import { SharePointResolutionOutcome } from 'src/domain/connectors/application/models/sharepoint-location';
import { ResolveSharePointLocationDto } from './dtos/resolve-sharepoint-location.dto';
import { SharePointLocationResolutionResponseDto } from './dtos/sharepoint-location-resolution-response.dto';

/**
 * For every member of the organization: whoever may edit a knowledge base
 * may add a SharePoint location to it, and IT decides what is reachable.
 */
@ApiTags('connectors')
@Controller('connectors/microsoft-365/sharepoint-locations')
@RequireFeature(FeatureFlag.Connectors)
export class SharePointLocationsController {
  constructor(
    private readonly resolveSharePointLocationUseCase: ResolveSharePointLocationUseCase,
  ) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check a SharePoint URL before adding it to a knowledge base',
    description:
      "Resolves a site, library or folder URL through the organization's Microsoft 365 connection. When it is not granted to Ayunis, returns the command that grants it, for the Microsoft 365 admin.",
  })
  @ApiResponse({ status: 200, type: SharePointLocationResolutionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Microsoft 365 is not set up (CONNECTOR_NOT_SET_UP)',
  })
  @ApiResponse({
    status: 422,
    description:
      'Microsoft Entra rejects the stored connection (CONNECTOR_CONNECTION_FAILED)',
  })
  async resolve(
    @Body() dto: ResolveSharePointLocationDto,
  ): Promise<SharePointLocationResolutionResponseDto> {
    return toResponse(
      await this.resolveSharePointLocationUseCase.execute(
        new ResolveSharePointLocationQuery(dto.url),
      ),
    );
  }
}

function toResponse(
  resolution: SharePointLocationResolution,
): SharePointLocationResolutionResponseDto {
  const empty = { kind: null, name: null, location: null, grant: null };
  switch (resolution.outcome) {
    case SharePointResolutionOutcome.FOUND:
      return { ...empty, ...resolution };
    case SharePointResolutionOutcome.NOT_GRANTED:
    case SharePointResolutionOutcome.NOT_FOUND_OR_NOT_GRANTED:
      return { ...empty, outcome: resolution.outcome, grant: resolution.grant };
    case SharePointResolutionOutcome.NOT_FOUND:
    case SharePointResolutionOutcome.UNSUPPORTED_URL:
      return { ...empty, outcome: resolution.outcome };
  }
}
