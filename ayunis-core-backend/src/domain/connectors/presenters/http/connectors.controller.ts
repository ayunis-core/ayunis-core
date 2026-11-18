import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Microsoft365ConnectorOverview } from 'src/domain/connectors/application/models/microsoft-365-connector-overview';
import { ListConnectorsUseCase } from 'src/domain/connectors/application/use-cases/list-connectors/list-connectors.use-case';
import { GetMicrosoft365ConnectorUseCase } from 'src/domain/connectors/application/use-cases/get-microsoft-365-connector/get-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorUseCase } from 'src/domain/connectors/application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorCommand } from 'src/domain/connectors/application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.command';
import { RemoveConnectionUseCase } from 'src/domain/connectors/application/use-cases/remove-connection/remove-connection.use-case';
import { RemoveConnectionCommand } from 'src/domain/connectors/application/use-cases/remove-connection/remove-connection.command';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorResponseDto } from './dtos/connector-response.dto';
import { Microsoft365ConnectorResponseDto } from './dtos/microsoft-365-connector-response.dto';
import { SaveMicrosoft365ConnectorDto } from './dtos/save-microsoft-365-connector.dto';

@ApiTags('connectors')
@Controller('connectors')
@RequireFeature(FeatureFlag.Connectors)
@Roles(UserRole.ADMIN)
export class ConnectorsController {
  constructor(
    private readonly listConnectorsUseCase: ListConnectorsUseCase,
    private readonly getMicrosoft365ConnectorUseCase: GetMicrosoft365ConnectorUseCase,
    private readonly saveMicrosoft365ConnectorUseCase: SaveMicrosoft365ConnectorUseCase,
    private readonly removeConnectionUseCase: RemoveConnectionUseCase,
  ) {}

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

  @Get('microsoft-365')
  @ApiOperation({
    summary: 'Get the Microsoft 365 connection of the organization',
    description: 'Tenant and client ID, never the client secret.',
  })
  @ApiResponse({ status: 200, type: Microsoft365ConnectorResponseDto })
  async getMicrosoft365(): Promise<Microsoft365ConnectorResponseDto> {
    return toMicrosoft365Response(
      await this.getMicrosoft365ConnectorUseCase.execute(),
    );
  }

  @Put('microsoft-365')
  @ApiOperation({
    summary: 'Set up the Microsoft 365 connection or change it',
    description:
      "Uses the organization's own Entra app. Without a client secret, the stored secret is kept; setting up requires one.",
  })
  @ApiResponse({ status: 200, type: Microsoft365ConnectorResponseDto })
  async saveMicrosoft365(
    @Body() dto: SaveMicrosoft365ConnectorDto,
  ): Promise<Microsoft365ConnectorResponseDto> {
    return toMicrosoft365Response(
      await this.saveMicrosoft365ConnectorUseCase.execute(
        new SaveMicrosoft365ConnectorCommand(dto),
      ),
    );
  }

  @Delete('microsoft-365')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove the Microsoft 365 connection',
    description:
      'Deletes the stored setup and credentials. What refers to the connection is kept and reconnects when it is set up again.',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async removeMicrosoft365(): Promise<void> {
    await this.removeConnectionUseCase.execute(
      new RemoveConnectionCommand({ product: ConnectorProduct.MICROSOFT_365 }),
    );
  }
}

function toMicrosoft365Response({
  status,
  setup,
}: Microsoft365ConnectorOverview): Microsoft365ConnectorResponseDto {
  return {
    status,
    tenantId: setup?.tenantId ?? null,
    clientId: setup?.clientId ?? null,
  };
}
