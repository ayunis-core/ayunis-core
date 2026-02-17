import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetMarketplaceSkillUseCase } from '../../application/use-cases/get-marketplace-skill/get-marketplace-skill.use-case';
import { GetMarketplaceSkillQuery } from '../../application/use-cases/get-marketplace-skill/get-marketplace-skill.query';
import { MarketplaceSkillResponseDto } from './dto/marketplace-skill-response.dto';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly getMarketplaceSkillUseCase: GetMarketplaceSkillUseCase,
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
}
