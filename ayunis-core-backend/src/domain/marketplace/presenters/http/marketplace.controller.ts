import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetMarketplaceAgentUseCase } from '../../application/use-cases/get-marketplace-agent/get-marketplace-agent.use-case';
import { GetMarketplaceAgentQuery } from '../../application/use-cases/get-marketplace-agent/get-marketplace-agent.query';
import { AgentResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly getMarketplaceAgentUseCase: GetMarketplaceAgentUseCase,
  ) {}

  @Get('agents/:identifier')
  @ApiOperation({ summary: 'Preview a marketplace agent before installation' })
  @ApiParam({
    name: 'identifier',
    description: 'The unique identifier slug of the marketplace agent',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the marketplace agent details',
  })
  @ApiResponse({ status: 404, description: 'Marketplace agent not found' })
  async getAgent(
    @Param('identifier') identifier: string,
  ): Promise<AgentResponseDto> {
    this.logger.log('getAgent', { identifier });

    return this.getMarketplaceAgentUseCase.execute(
      new GetMarketplaceAgentQuery(identifier),
    );
  }
}
