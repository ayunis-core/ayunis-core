import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HasActiveSubscriptionUseCase } from './has-active-subscription.use-case';
import { HasActiveSubscriptionQuery } from './has-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { SubscriptionError } from '../../subscription.errors';
import { isActive } from '../../util/is-active';

// Mock the isActive utility
jest.mock('../../util/is-active');

describe('HasActiveSubscriptionUseCase', () => {
  let useCase: HasActiveSubscriptionUseCase;
  let subscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let configService: jest.Mocked<ConfigService>;
  let mockIsActive: jest.MockedFunction<typeof isActive>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as any;

  beforeAll(async () => {
    const mockSubscriptionRepository = {
      findByOrgId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HasActiveSubscriptionUseCase,
        {
          provide: SubscriptionRepository,
          useValue: mockSubscriptionRepository,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    useCase = module.get<HasActiveSubscriptionUseCase>(
      HasActiveSubscriptionUseCase,
    );
    subscriptionRepository = module.get(SubscriptionRepository);
    configService = module.get(ConfigService);
    mockIsActive = isActive as jest.MockedFunction<typeof isActive>;

    // Mock logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return true for self-hosted instances', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(true);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('app.isSelfHosted');
      expect(subscriptionRepository.findByOrgId).not.toHaveBeenCalled();
    });

    it('should return false when no subscriptions exist', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);
      subscriptionRepository.findByOrgId.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toBe(false);
      expect(subscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        mockOrgId,
      );
    });

    it('should return true when at least one active subscription exists', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);

      const mockSubscriptions = [
        { id: '1', orgId: mockOrgId } as any,
        { id: '2', orgId: mockOrgId } as any,
      ];

      subscriptionRepository.findByOrgId.mockResolvedValue(
        mockSubscriptions as any,
      );
      mockIsActive.mockImplementation(() => true);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toBe(true);
      expect(subscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        mockOrgId,
      );
      expect(mockIsActive).toHaveBeenCalledWith(mockSubscriptions[0]);
    });

    it('should return false when all subscriptions are inactive', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);

      const mockSubscriptions = [
        { id: '1', orgId: mockOrgId } as any,
        { id: '2', orgId: mockOrgId } as any,
      ];

      subscriptionRepository.findByOrgId.mockResolvedValue(
        mockSubscriptions as any,
      );
      mockIsActive.mockReturnValue(false);

      // Act
      const result = await useCase.execute(query);

      // Assert
      expect(result).toBe(false);
      expect(subscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        mockOrgId,
      );
      expect(mockIsActive).toHaveBeenCalledTimes(2);
    });

    it('should log the subscription check', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);
      subscriptionRepository.findByOrgId.mockResolvedValue([]);

      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      await useCase.execute(query);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Checking active subscription', {
        orgId: query.orgId,
      });
    });

    it('should log debug information when no subscriptions found', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);
      subscriptionRepository.findByOrgId.mockResolvedValue([]);

      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      await useCase.execute(query);

      // Assert
      expect(debugSpy).toHaveBeenCalledWith('Finding subscription');
      expect(debugSpy).toHaveBeenCalledWith(
        'No subscription found for organization',
        {
          orgId: mockOrgId,
        },
      );
    });

    it('should re-throw SubscriptionError instances', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);

      const subscriptionError = new (class extends SubscriptionError {})(
        'Test subscription error',
        0 as any,
      );
      subscriptionRepository.findByOrgId.mockRejectedValue(subscriptionError);

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toBeDefined();
      expect(subscriptionRepository.findByOrgId).toHaveBeenCalledWith(
        mockOrgId,
      );
    });

    it('should handle and log non-SubscriptionError errors', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);

      const genericError = new Error('Database connection failed');
      subscriptionRepository.findByOrgId.mockRejectedValue(genericError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toThrow(
        'Database connection failed',
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Checking active subscription failed',
        {
          error: 'Database connection failed',
          orgId: mockOrgId,
        },
      );
    });

    it('should handle unknown error types', async () => {
      // Arrange
      const query = new HasActiveSubscriptionQuery(mockOrgId);
      configService.get.mockReturnValue(false);

      subscriptionRepository.findByOrgId.mockRejectedValue('string error');

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Act & Assert
      await expect(useCase.execute(query)).rejects.toBeDefined();

      expect(errorSpy).toHaveBeenCalledWith(
        'Checking active subscription failed',
        {
          error: 'Unknown error',
          orgId: mockOrgId,
        },
      );
    });
  });
});
