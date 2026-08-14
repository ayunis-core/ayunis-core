import { Controller, Get, Header, Inject } from '@nestjs/common';
import { IsCloudUseCase } from 'src/app/application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from 'src/app/application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { GetFrontendRuntimeConfigUseCase } from 'src/app/application/use-cases/get-frontend-runtime-config/get-frontend-runtime-config.use-case';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsCloudResponseDto } from './dto/is-cloud-response.dto';
import { FeatureTogglesResponseDto } from './dto/feature-toggles-response.dto';
import { Public } from 'src/common/guards/public.guard';
import { ConfigType } from '@nestjs/config';
import { featuresConfig } from 'src/config/features.config';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly isCloudUseCase: IsCloudUseCase,
    private readonly isRegistrationDisabledUseCase: IsRegistrationDisabledUseCase,
    @Inject(featuresConfig.KEY)
    private readonly features: ConfigType<typeof featuresConfig>,
    private readonly getFrontendRuntimeConfigUseCase: GetFrontendRuntimeConfigUseCase,
  ) {}

  // Serves the SPA's runtime environment (see frontend.config.ts). Loaded by
  // index.html before the app bundle; the route wins over the static
  // dev-stub copy in dist/frontend because serve-static registers its
  // handlers in onModuleInit, after controller routes. Excluded from the
  // global /api prefix in main.ts and from the OpenAPI spec (not part of the
  // public API, keeps the schema-drift check quiet).
  @Public()
  @ApiExcludeEndpoint()
  @Get('config.js')
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  frontendRuntimeConfig(): string {
    const values = this.getFrontendRuntimeConfigUseCase.execute();
    return `window.__RUNTIME_CONFIG__ = Object.freeze(${JSON.stringify(values)});`;
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Check if the deployment is running in a cloud environment',
  })
  @ApiResponse({
    status: 200,
    description: 'Cloud deployment status',
    type: IsCloudResponseDto,
  })
  isCloud(): IsCloudResponseDto {
    return {
      isCloud: this.isCloudUseCase.execute(),
      isRegistrationDisabled: this.isRegistrationDisabledUseCase.execute(),
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Check if the deployment is healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status',
  })
  health(): { status: 'healthy' | 'unhealthy' } {
    return {
      status: 'healthy',
    };
  }

  @Public()
  @Get('feature-toggles')
  @ApiOperation({
    summary: 'Get the current feature toggle states',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature toggle states',
    type: FeatureTogglesResponseDto,
  })
  featureToggles(): FeatureTogglesResponseDto {
    return {
      knowledgeBasesEnabled: this.features.knowledgeBasesEnabled,
      letterheadsEnabled: this.features.letterheadsEnabled,
      skillsEnabled: this.features.skillsEnabled,
      workspacesEnabled: this.features.workspacesEnabled,
      agentRuntimeEnabled: this.features.agentRuntimeEnabled,
      ssoLoginEnabled: this.features.ssoLoginEnabled,
    };
  }
}
