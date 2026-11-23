import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { Public } from 'src/common/guards/public.guard';
import { SURFACE_REGISTRY } from 'src/config/surface-registry';
import { GetOutlookManifestUseCase } from 'src/domain/office-addins/application/use-cases/get-outlook-manifest/get-outlook-manifest.use-case';

// Downloaded by tenant admins to deploy the add-in, not by the frontend, so
// it stays out of the OpenAPI spec and the generated client.
@Controller('office-addins')
@RequireFeature(SURFACE_REGISTRY.outlook.featureFlag.name)
export class OfficeAddinsController {
  constructor(
    private readonly getOutlookManifestUseCase: GetOutlookManifestUseCase,
  ) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get(SURFACE_REGISTRY.outlook.manifest.route)
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  getOutlookManifest(): Promise<string> {
    return this.getOutlookManifestUseCase.execute();
  }
}
