import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetMarketplaceSkillUseCase } from '../../application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from '../../application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { MarketplaceSkillResponseDto } from './dto/marketplace-skill-response.dto';
import { GetMarketplaceIntegrationUseCase } from '../../application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { GetMarketplaceIntegrationQuery } from '../../application/use-cases/get-marketplace-integration/get-marketplace-integration.query';
import {
  MarketplaceIntegrationResponseDto,
  MarketplaceIntegrationConfigSchemaDto,
} from './dto/marketplace-integration-response.dto';
import { IntegrationResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
    private readonly getMarketplaceIntegrationUseCase: GetMarketplaceIntegrationUseCase,
  ) {}

  @Get('skills/:identifier')
  @ApiOperation({ summary: 'Preview a marketplace skill before installation' })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier slug of the marketplace skill',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the marketplace skill details',
    type: MarketplaceSkillResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Marketplace skill not found' })
  async getSkill(
    @Param('identifier') identifier: string,
  ): Promise<MarketplaceSkillResponseDto> {
    this.logger.log('getSkill', { identifier });

    return this.getMarketplaceSkillUseCase.execute(
      new GetMarketplaceSkillQuery(identifier),
    );
  }

  @Get('integrations/:identifier')
  @ApiOperation({
    summary: 'Preview a marketplace integration before installation',
  })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier slug of the marketplace integration',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the marketplace integration details',
    type: MarketplaceIntegrationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Marketplace integration not found',
  })
  async getIntegration(
    @Param('identifier') identifier: string,
  ): Promise<MarketplaceIntegrationResponseDto> {
    this.logger.log('getIntegration', { identifier });

    const integration = await this.getMarketplaceIntegrationUseCase.execute(
      new GetMarketplaceIntegrationQuery(identifier),
    );

    return this.mapIntegrationResponse(integration);
  }

  private mapIntegrationResponse(
    integration: IntegrationResponseDto,
  ): MarketplaceIntegrationResponseDto {
    const rawSchema = integration.configSchema as Record<string, unknown>;
    const configSchema: MarketplaceIntegrationConfigSchemaDto = {
      authType: rawSchema.authType as string,
      orgFields: rawSchema.orgFields as MarketplaceIntegrationConfigSchemaDto['orgFields'],
      userFields: rawSchema.userFields as MarketplaceIntegrationConfigSchemaDto['userFields'],
    };

    return {
      id: integration.id,
      identifier: integration.identifier,
      name: integration.name,
      shortDescription: integration.shortDescription,
      description: integration.description,
      iconUrl: integration.iconUrl,
      serverUrl: integration.serverUrl,
      configSchema,
      featured: integration.featured,
      published: integration.published,
      preInstalled: integration.preInstalled,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }
}
