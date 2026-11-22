import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ListConnectorsUseCase } from 'src/domain/connectors/application/use-cases/list-connectors/list-connectors.use-case';
import { ConnectorResponseDto } from './dtos/connector-response.dto';

@ApiTags('connectors')
@Controller('connectors')
@RequireFeature(FeatureFlag.Connectors)
@Roles(UserRole.ADMIN)
export class ConnectorsController {
  constructor(private readonly listConnectorsUseCase: ListConnectorsUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'List the available connectors of the organization',
    description:
      'Returns every available product with whether the organization has set it up. Credentials are never returned.',
  })
  @ApiResponse({ status: 200, type: [ConnectorResponseDto] })
  async list(): Promise<ConnectorResponseDto[]> {
    const connectors = await this.listConnectorsUseCase.execute();
    return connectors.map(({ product, status }) => ({ product, status }));
  }
}
