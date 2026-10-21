import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  ManualSubscriptionEditGuard,
  RequireManualSubscriptionEditing,
} from './manual-subscription-edit.guard';

@RequireManualSubscriptionEditing()
class SubscriptionController {}

@RequireManualSubscriptionEditing('ayunis_core_academy')
class AddonsController {}

function context(
  method: string,
  controller = SubscriptionController,
  type?: string,
): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () => function handler() {},
    switchToHttp: () => ({ getRequest: () => ({ method, params: { type } }) }),
  } as unknown as ExecutionContext;
}

describe('manual subscription editing policy', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'blocks cloud %s writes when Fynn-managed',
    (method) => {
      const guard = new ManualSubscriptionEditGuard(
        new Reflector(),
        new ConfigService({
          app: { isCloudHosted: true },
          features: { fynnManagedSubscriptionsEnabled: true },
        }),
      );
      expect(() => guard.canActivate(context(method))).toThrow(
        ForbiddenException,
      );
    },
  );

  it.each([
    [true, false],
    [false, true],
    [false, false],
  ])('preserves writes for cloud=%s, flag=%s', (cloud, enabled) => {
    const guard = new ManualSubscriptionEditGuard(
      new Reflector(),
      new ConfigService({
        app: { isCloudHosted: cloud },
        features: { fynnManagedSubscriptionsEnabled: enabled },
      }),
    );
    expect(guard.canActivate(context('POST'))).toBe(true);
  });

  it('preserves reads and non-Academy add-on management', () => {
    const guard = new ManualSubscriptionEditGuard(
      new Reflector(),
      new ConfigService({
        app: { isCloudHosted: true },
        features: { fynnManagedSubscriptionsEnabled: true },
      }),
    );
    expect(guard.canActivate(context('GET'))).toBe(true);
    expect(
      guard.canActivate(context('POST', AddonsController, 'another-addon')),
    ).toBe(true);
    expect(() =>
      guard.canActivate(
        context('DELETE', AddonsController, 'ayunis_core_academy'),
      ),
    ).toThrow(ForbiddenException);
  });
});
