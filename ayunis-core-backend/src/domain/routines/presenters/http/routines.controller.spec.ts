import { REQUIRE_SUBSCRIPTION_KEY } from 'src/iam/authorization/application/decorators/subscription.decorator';
import { RoutinesController } from './routines.controller';

describe(RoutinesController.name, () => {
  it('gates the paid task improver behind a subscription or trial', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_SUBSCRIPTION_KEY,
        RoutinesController.prototype.improvePrompt,
      ),
    ).toBeDefined();
  });
});
