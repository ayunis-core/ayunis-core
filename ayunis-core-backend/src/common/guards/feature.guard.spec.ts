import { NotFoundException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';
import { FeatureGuard } from 'src/common/guards/feature.guard';
import type { ExecutionContext } from '@nestjs/common';
import type { FeatureFlag } from 'src/config/features.config';

describe('FeatureGuard', () => {
  const exampleFlag = 'exampleEnabled' as unknown as FeatureFlag;

  let guard: FeatureGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const mockExecutionContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new FeatureGuard(reflector, configService);
  });

  it('should allow access when no feature metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should allow access when the feature is enabled', () => {
    reflector.getAllAndOverride.mockReturnValue(exampleFlag);
    configService.get.mockReturnValue(true);

    const result = guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('features.exampleEnabled');
  });

  it('should throw NotFoundException when the feature is disabled', () => {
    reflector.getAllAndOverride.mockReturnValue(exampleFlag);
    configService.get.mockReturnValue(false);

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      NotFoundException,
    );
    expect(configService.get).toHaveBeenCalledWith('features.exampleEnabled');
  });

  it('should throw NotFoundException when the feature config value is undefined', () => {
    reflector.getAllAndOverride.mockReturnValue(exampleFlag);
    configService.get.mockReturnValue(undefined);

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(
      NotFoundException,
    );
  });
});
