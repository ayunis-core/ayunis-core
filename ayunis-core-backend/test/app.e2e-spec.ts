import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app/presenters/http/app.controller';
import { IsCloudUseCase } from '../src/app/application/use-cases/is-cloud/is-cloud.use-case';

describe('AppController', () => {
  let appController: AppController;
  let isCloudUseCase: IsCloudUseCase;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: IsCloudUseCase,
          useValue: {
            execute: jest.fn().mockReturnValue(false),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    isCloudUseCase = app.get<IsCloudUseCase>(IsCloudUseCase);
  });

  describe('root', () => {
    it('should return cloud deployment status', () => {
      const result = appController.isCloud();
      expect(result).toEqual({ isCloud: false });
      expect(isCloudUseCase.execute).toHaveBeenCalled();
    });

    it('should return true when running in cloud', () => {
      jest.spyOn(isCloudUseCase, 'execute').mockReturnValue(true);
      const result = appController.isCloud();
      expect(result).toEqual({ isCloud: true });
    });
  });
});
