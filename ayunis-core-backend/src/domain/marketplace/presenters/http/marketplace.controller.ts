import { Controller, Get, Inject, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ConfigType } from '@nestjs/config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { GetMarketplaceSkillUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { MarketplaceSkillResponseDto } from './dto/marketplace-skill-response.dto';
import { GetMarketplaceIntegrationUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.use-case';
import { GetMarketplaceIntegrationQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-integration/get-marketplace-integration.query';
import { MarketplaceIntegrationResponseDto } from './dto/marketplace-integration-response.dto';
import { MarketplaceConfigResponseDto } from './dto/marketplace-config-response.dto';
import { GetMarketplaceRoutineUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-routine/get-marketplace-routine.use-case';
import { GetMarketplaceRoutineQuery } from 'src/domain/marketplace/application/use-cases/get-marketplace-routine/get-marketplace-routine.query';
import { MarketplaceRoutineResponseDto } from './dto/marketplace-routine-response.dto';
import { ListSuggestedMarketplaceSkillsUseCase } from 'src/domain/marketplace/application/use-cases/list-suggested-marketplace-skills/list-suggested-marketplace-skills.use-case';
import { ListSuggestedMarketplaceRoutinesUseCase } from 'src/domain/marketplace/application/use-cases/list-suggested-marketplace-routines/list-suggested-marketplace-routines.use-case';
import {
  MarketplaceRoutineSuggestionResponseDto,
  MarketplaceSuggestionResponseDto,
} from './dto/marketplace-suggestion-response.dto';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
    private readonly getMarketplaceIntegrationUseCase: GetMarketplaceIntegrationUseCase,
    private readonly getMarketplaceRoutineUseCase: GetMarketplaceRoutineUseCase,
    private readonly listSuggestedMarketplaceSkillsUseCase: ListSuggestedMarketplaceSkillsUseCase,
    private readonly listSuggestedMarketplaceRoutinesUseCase: ListSuggestedMarketplaceRoutinesUseCase,
    @Inject(marketplaceConfig.KEY)
    private readonly marketplace: ConfigType<typeof marketplaceConfig>,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get marketplace availability and URL' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether the marketplace is enabled and its URL',
    type: MarketplaceConfigResponseDto,
  })
  getConfig(): MarketplaceConfigResponseDto {
    return {
      enabled: this.marketplace.enabled,
      url: this.marketplace.serviceUrl ?? null,
    };
  }

  @Get('suggested-skills')
  @ApiOperation({
    summary: 'List the marketplace skills suggested to users without skills',
  })
  @ApiResponse({
    status: 200,
    description: 'At most six suggested skills, featured first, then by name',
    type: [MarketplaceSuggestionResponseDto],
  })
  @ApiResponse({ status: 503, description: 'Marketplace unavailable' })
  async listSuggestedSkills(): Promise<MarketplaceSuggestionResponseDto[]> {
    this.logger.log('listSuggestedSkills');
    const skills = await this.listSuggestedMarketplaceSkillsUseCase.execute();
    return skills.map((skill) => ({
      identifier: skill.identifier,
      name: skill.name,
      shortDescription: skill.shortDescription,
      iconName: skill.iconName ?? null,
    }));
  }

  @Get('suggested-routines')
  @RequireFeature(FeatureFlag.Routines)
  @ApiOperation({
    summary:
      'List the marketplace routines suggested to users without routines',
  })
  @ApiResponse({
    status: 200,
    description: 'At most six suggested routines, featured first, then by name',
    type: [MarketplaceRoutineSuggestionResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Routines are disabled' })
  @ApiResponse({ status: 503, description: 'Marketplace unavailable' })
  async listSuggestedRoutines(): Promise<
    MarketplaceRoutineSuggestionResponseDto[]
  > {
    this.logger.log('listSuggestedRoutines');
    const routines =
      await this.listSuggestedMarketplaceRoutinesUseCase.execute();
    return routines.map((routine) => ({
      identifier: routine.identifier,
      name: routine.name,
      shortDescription: routine.shortDescription,
      iconName: routine.iconName ?? null,
      schedule: routine.schedule,
    }));
  }

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
    this.logger.log({ identifier }, 'getSkill');

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
    this.logger.log({ identifier }, 'getIntegration');

    const integration = await this.getMarketplaceIntegrationUseCase.execute(
      new GetMarketplaceIntegrationQuery(identifier),
    );

    return {
      id: integration.id,
      identifier: integration.identifier,
      name: integration.name,
      shortDescription: integration.shortDescription,
      description: integration.description,
      iconName: integration.iconName ?? null,
      logoUrl: integration.logoUrl ?? null,
      integrationCategoryId: integration.integrationCategoryId ?? null,
      serverUrl: integration.serverUrl,
      customerProvidesServerUrl: integration.customerProvidesServerUrl,
      serverUrlHint: integration.serverUrlHint,
      configSchema:
        integration.configSchema as unknown as MarketplaceIntegrationResponseDto['configSchema'],
      featured: integration.featured,
      published: integration.published,
      preInstalled: integration.preInstalled,
      legalTextUrl: integration.legalTextUrl ?? null,
      legalTextVersion: integration.legalTextVersion ?? null,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }

  @Get('routines/:identifier')
  @RequireFeature(FeatureFlag.Routines)
  @ApiOperation({
    summary: 'Preview a marketplace routine before installation',
  })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier slug of the marketplace routine',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the marketplace routine details',
    type: MarketplaceRoutineResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'Marketplace routine not found or not published, or routines are disabled',
  })
  @ApiResponse({ status: 503, description: 'Marketplace unavailable' })
  async getRoutine(
    @Param('identifier') identifier: string,
  ): Promise<MarketplaceRoutineResponseDto> {
    this.logger.log({ identifier }, 'getRoutine');

    const routine = await this.getMarketplaceRoutineUseCase.execute(
      new GetMarketplaceRoutineQuery(identifier),
    );

    return {
      id: routine.id,
      identifier: routine.identifier,
      name: routine.name,
      shortDescription: routine.shortDescription,
      description: routine.description,
      iconName: routine.iconName,
      schedule: routine.schedule,
      internetAccess: routine.internetAccess,
      allowedDomains: routine.allowedDomains,
    };
  }
}
