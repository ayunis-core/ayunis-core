import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { RequireFeature } from 'src/common/guards/feature.guard';
import { Public } from 'src/common/guards/public.guard';
import { FeatureFlag } from 'src/config/features.config';
import { GetOutlookManifestUseCase } from 'src/domain/office-addins/application/use-cases/get-outlook-manifest/get-outlook-manifest.use-case';

// Downloaded by tenant admins to deploy the add-in, not by the frontend, so
// it stays out of the OpenAPI spec and the generated client.
@Controller('office-addins')
@RequireFeature(FeatureFlag.OutlookAddin)
export class OfficeAddinsController {
  constructor(
    private readonly getOutlookManifestUseCase: GetOutlookManifestUseCase,
  ) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get('outlook/manifest.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'no-cache')
  getOutlookManifest(): Promise<string> {
    return this.getOutlookManifestUseCase.execute();
  }
}
