import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { FeatureFlag } from 'src/config/features.config';
import { Roles } from 'src/iam/authorization/application/decorators/roles.decorator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { RemoveConnectionUseCase } from 'src/domain/connectors/application/use-cases/remove-connection/remove-connection.use-case';
import { RemoveConnectionCommand } from 'src/domain/connectors/application/use-cases/remove-connection/remove-connection.command';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import type { Microsoft365ConnectorOverview } from 'src/domain/connectors/providers/microsoft-365/application/models/microsoft-365-connector-overview';
import { GetMicrosoft365ConnectorUseCase } from 'src/domain/connectors/providers/microsoft-365/application/use-cases/get-microsoft-365-connector/get-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorUseCase } from 'src/domain/connectors/providers/microsoft-365/application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.use-case';
import { SaveMicrosoft365ConnectorCommand } from 'src/domain/connectors/providers/microsoft-365/application/use-cases/save-microsoft-365-connector/save-microsoft-365-connector.command';
import { TestMicrosoft365ConnectionUseCase } from 'src/domain/connectors/providers/microsoft-365/application/use-cases/test-microsoft-365-connection/test-microsoft-365-connection.use-case';
import { Microsoft365ConnectorResponseDto } from './dtos/microsoft-365-connector-response.dto';
import { SaveMicrosoft365ConnectorDto } from './dtos/save-microsoft-365-connector.dto';
import { SavedMicrosoft365ConnectorResponseDto } from './dtos/saved-microsoft-365-connector-response.dto';
import { Microsoft365ConnectionTestResponseDto } from './dtos/microsoft-365-connection-test-response.dto';

/**
 * The operation IDs are those these routes had in `ConnectorsController`,
 * so the generated API clients keep their names.
 */
@ApiTags('connectors')
@Controller('connectors/microsoft-365')
@RequireFeature(FeatureFlag.Connectors)
@Roles(UserRole.ADMIN)
export class Microsoft365ConnectorController {
  constructor(
    private readonly getMicrosoft365ConnectorUseCase: GetMicrosoft365ConnectorUseCase,
    private readonly saveMicrosoft365ConnectorUseCase: SaveMicrosoft365ConnectorUseCase,
    private readonly removeConnectionUseCase: RemoveConnectionUseCase,
    private readonly testMicrosoft365ConnectionUseCase: TestMicrosoft365ConnectionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'ConnectorsController_getMicrosoft365',
    summary: 'Get the Microsoft 365 connection of the organization',
    description: 'Tenant and client ID, never the client secret.',
  })
  @ApiResponse({ status: 200, type: Microsoft365ConnectorResponseDto })
  async getMicrosoft365(): Promise<Microsoft365ConnectorResponseDto> {
    return toMicrosoft365Response(
      await this.getMicrosoft365ConnectorUseCase.execute(),
    );
  }

  @Put()
  @ApiOperation({
    operationId: 'ConnectorsController_saveMicrosoft365',
    summary: 'Set up the Microsoft 365 connection or change it',
    description:
      "Uses the organization's own Entra app. Without a client secret, the stored secret is kept; setting up requires one. The saved connection is tested right away.",
  })
  @ApiResponse({ status: 200, type: SavedMicrosoft365ConnectorResponseDto })
  async saveMicrosoft365(
    @Body() dto: SaveMicrosoft365ConnectorDto,
  ): Promise<SavedMicrosoft365ConnectorResponseDto> {
    const saved = await this.saveMicrosoft365ConnectorUseCase.execute(
      new SaveMicrosoft365ConnectorCommand(dto),
    );
    return {
      ...toMicrosoft365Response(saved),
      connectionTest: saved.connectionTest,
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'ConnectorsController_testMicrosoft365',
    summary: 'Test the Microsoft 365 connection',
    description:
      "Requests an app-only token with the stored credentials and shows the permissions granted in it. Entra refusing the token, or not answering, is the test's outcome, not an error.",
  })
  @ApiResponse({ status: 200, type: Microsoft365ConnectionTestResponseDto })
  async testMicrosoft365(): Promise<Microsoft365ConnectionTestResponseDto> {
    return this.testMicrosoft365ConnectionUseCase.execute();
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'ConnectorsController_removeMicrosoft365',
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
