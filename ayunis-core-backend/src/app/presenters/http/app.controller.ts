import { Controller, Get, Inject } from '@nestjs/common';
import { IsCloudUseCase } from 'src/app/application/use-cases/is-cloud/is-cloud.use-case';
import { IsRegistrationDisabledUseCase } from 'src/app/application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  ) {}

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
      agentsEnabled: this.features.agentsEnabled,
      knowledgeBasesEnabled: this.features.knowledgeBasesEnabled,
      promptsEnabled: this.features.promptsEnabled,
      skillsEnabled: this.features.skillsEnabled,
    };
  }
}
