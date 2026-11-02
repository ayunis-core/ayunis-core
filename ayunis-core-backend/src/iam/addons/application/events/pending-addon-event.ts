import type { AddonActivatedEvent } from './addon-activated.event';
import type { AddonDeactivatedEvent } from './addon-deactivated.event';

export type PendingAddonEvent =
  | { name: typeof AddonActivatedEvent.EVENT_NAME; event: AddonActivatedEvent }
  | {
      name: typeof AddonDeactivatedEvent.EVENT_NAME;
      event: AddonDeactivatedEvent;
    };
