import { AppController } from './app.controller';
import type { IsCloudUseCase } from 'src/app/application/use-cases/is-cloud/is-cloud.use-case';
import type { IsRegistrationDisabledUseCase } from 'src/app/application/use-cases/is-registration-disabled/is-registration-disabled.use-case';
import type { GetFrontendRuntimeConfigUseCase } from 'src/app/application/use-cases/get-frontend-runtime-config/get-frontend-runtime-config.use-case';
import type { FeaturesConfig } from 'src/config/features.config';

describe('AppController', () => {
  it('exposes every configured feature toggle', () => {
    const features: FeaturesConfig = {
      knowledgeBasesEnabled: true,
      letterheadsEnabled: false,
      skillsEnabled: true,
      agentRuntimeEnabled: true,
    };
    const controller = new AppController(
      { execute: jest.fn() } as unknown as IsCloudUseCase,
      { execute: jest.fn() } as unknown as IsRegistrationDisabledUseCase,
      features,
      { execute: jest.fn() } as unknown as GetFrontendRuntimeConfigUseCase,
    );

    expect(controller.featureToggles()).toEqual(features);
  });
});
