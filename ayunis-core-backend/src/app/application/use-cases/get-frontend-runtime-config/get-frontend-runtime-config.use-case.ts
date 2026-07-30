import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  frontendConfig,
  FrontendRuntimeConfig,
} from 'src/config/frontend.config';

@Injectable()
export class GetFrontendRuntimeConfigUseCase {
  constructor(
    @Inject(frontendConfig.KEY)
    private readonly config: ConfigType<typeof frontendConfig>,
  ) {}

  execute(): FrontendRuntimeConfig {
    return this.config;
  }
}
