import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import {
  ConnectorLocationOutcome,
  type ConnectorLocationResolution,
} from 'src/domain/connectors/application/models/connector-location-resolution';
import { ResolveConnectorLocationQuery } from 'src/domain/connectors/application/use-cases/resolve-connector-location/resolve-connector-location.query';
import { ResolveConnectorLocationUseCase } from 'src/domain/connectors/application/use-cases/resolve-connector-location/resolve-connector-location.use-case';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
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
    private readonly resolveConnectorLocationUseCase: ResolveConnectorLocationUseCase,
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
      await this.resolveConnectorLocationUseCase.execute(
        new ResolveConnectorLocationQuery({
          product: ConnectorProduct.MICROSOFT_365,
          location: dto.url,
        }),
      ),
    );
  }
}

function toResponse(
  resolution: ConnectorLocationResolution,
): SharePointLocationResolutionResponseDto {
  const empty = { kind: null, name: null, location: null, grant: null };
  switch (resolution.outcome) {
    case ConnectorLocationOutcome.FOUND:
      return { ...empty, ...resolution };
    case ConnectorLocationOutcome.NOT_GRANTED:
    case ConnectorLocationOutcome.NOT_FOUND_OR_NOT_GRANTED:
      return { ...empty, outcome: resolution.outcome, grant: resolution.grant };
    case ConnectorLocationOutcome.NOT_FOUND:
    case ConnectorLocationOutcome.UNSUPPORTED_URL:
      return { ...empty, outcome: resolution.outcome };
  }
}
