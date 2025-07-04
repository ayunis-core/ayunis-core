import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionGuard } from './subscription.guard';
import { HasActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/has-active-subscription/has-active-subscription.use-case';
import { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorators/subscription.decorator';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: Reflector;
  let hasActiveSubscriptionUseCase: HasActiveSubscriptionUseCase;
  let mockExecutionContext: ExecutionContext;

  const mockUser = new ActiveUser(
    'user-id' as any,
    'test@example.com',
    UserRole.USER,
    'org-id' as any,
    'Test User',
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: HasActiveSubscriptionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<SubscriptionGuard>(SubscriptionGuard);
    reflector = module.get<Reflector>(Reflector);
    hasActiveSubscriptionUseCase = module.get<HasActiveSubscriptionUseCase>(
      HasActiveSubscriptionUseCase,
    );

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: mockUser,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  });

  describe('canActivate', () => {
    it('should return true when subscription is not required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        REQUIRE_SUBSCRIPTION_KEY,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
    });

    it('should return false when user is not found in request', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const mockRequest = jest.fn().mockReturnValue({
        user: null,
      });
      mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: mockRequest,
      });

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should return true when user has active subscription', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      jest
        .spyOn(hasActiveSubscriptionUseCase, 'execute')
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(hasActiveSubscriptionUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: mockUser.orgId,
        }),
      );
    });

    it('should return false when user does not have active subscription', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      jest
        .spyOn(hasActiveSubscriptionUseCase, 'execute')
        .mockResolvedValue(false);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should return false when subscription check throws error', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      jest
        .spyOn(hasActiveSubscriptionUseCase, 'execute')
        .mockRejectedValue(new Error('Subscription check failed'));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });
  });
});
