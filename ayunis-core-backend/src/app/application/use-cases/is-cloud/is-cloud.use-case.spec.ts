import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IsCloudUseCase } from './is-cloud.use-case';

describe('IsCloudUseCase', () => {
  let useCase: IsCloudUseCase;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsCloudUseCase,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<IsCloudUseCase>(IsCloudUseCase);
    configService = module.get(ConfigService);
  });

  describe('execute', () => {
    it('should return true when app.isCloudHosted is true', () => {
      configService.get.mockReturnValue(true);

      const result = useCase.execute();

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('app.isCloudHosted');
    });

    it('should return false when app.isCloudHosted is false', () => {
      configService.get.mockReturnValue(false);

      const result = useCase.execute();

      expect(result).toBe(false);
      expect(configService.get).toHaveBeenCalledWith('app.isCloudHosted');
    });

    it('should return false when app.isCloudHosted is null', () => {
      configService.get.mockReturnValue(null);

      const result = useCase.execute();

      expect(result).toBe(false);
      expect(configService.get).toHaveBeenCalledWith('app.isCloudHosted');
    });

    it('should return false when app.isCloudHosted is undefined', () => {
      configService.get.mockReturnValue(undefined);

      const result = useCase.execute();

      expect(result).toBe(false);
      expect(configService.get).toHaveBeenCalledWith('app.isCloudHosted');
    });
  });
});
