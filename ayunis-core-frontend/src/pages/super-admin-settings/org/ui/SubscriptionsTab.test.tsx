import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SubscriptionResponseDto } from '@/shared/api';
import SubscriptionsTab from './SubscriptionsTab';
import AddonsSection from './AddonsSection';

const state = vi.hoisted(() => ({ managed: false, status: 'resolved' }));
vi.mock('@/pages/super-admin-settings/org/api/useSuperAdminAddons', () => ({
  useSuperAdminAddons: () => ({
    addons: [{ type: 'ayunis_core_academy', active: true }],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminActivateAddon',
  () => ({ useSuperAdminActivateAddon: () => ({ activateAddon: vi.fn() }) }),
);
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminDeactivateAddon',
  () => ({
    useSuperAdminDeactivateAddon: () => ({ deactivateAddon: vi.fn() }),
  }),
);
vi.mock('@/features/feature-toggles', () => ({
  useIsFeatureEnabled: () => state.managed,
  useFeatureToggles: () => ({
    isLoading: state.status === 'loading',
    error: state.status === 'error' ? new Error() : null,
    refetch: vi.fn(),
  }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminCreditUsage',
  () => ({ default: () => ({ creditUsage: { creditsUsed: 0 } }) }),
);
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminSubscriptionCancel',
  () => ({ default: () => ({ cancelSubscription: vi.fn() }) }),
);
vi.mock(
  '@/pages/super-admin-settings/org/api/useSuperAdminSubscriptionUncancel',
  () => ({ default: () => ({ uncancelSubscription: vi.fn() }) }),
);
vi.mock('./ChangeSubscriptionDialog', () => ({
  default: () => <button>change-package</button>,
}));
vi.mock('./LicenseSeatsUpdateDialog', () => ({
  default: () => <button>edit-seats</button>,
}));
vi.mock('./CreditBudgetUpdateDialog', () => ({
  default: () => <button>edit-credits</button>,
}));
vi.mock('./BillingInfoUpdateDialog', () => ({
  default: () => <button>edit-billing</button>,
}));
vi.mock('./SubscriptionStartDateUpdateDialog', () => ({
  default: () => <button>edit-start-date</button>,
}));
vi.mock('./CreateSubscriptionDialog', () => ({
  default: () => <button>create-subscription</button>,
}));
vi.mock('./ResolveSubscriptionOverlapDialog', () => ({
  default: () => <button>resolve-overlap</button>,
}));

const subscription: SubscriptionResponseDto = {
  id: 'subscription-id',
  orgId: 'org-id',
  type: 'SEAT_BASED',
  noOfSeats: 10,
  availableSeats: 3,
  startsAt: '2026-01-01T00:00:00Z',
  nextRenewalDate: '2027-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  endsAt: null,
  billingInfo: {
    companyName: 'Municipal Test Org',
    street: 'Main',
    houseNumber: '1',
    postalCode: '12345',
    city: 'Berlin',
    country: 'DE',
  },
};

describe('Externally managed subscription UI', () => {
  it.each(['loading', 'error'])(
    'keeps edits blocked without claiming external ownership while %s',
    (status) => {
      state.managed = true;
      state.status = status;
      const html = renderToStaticMarkup(
        <SubscriptionsTab
          orgId="org-id"
          subscription={subscription}
          subscriptionHistory={[]}
          activeSubscriptionCount={1}
        />,
      );
      expect(html).not.toContain('subscription.managedExternally');
      expect(html).not.toContain('edit-seats');
      expect(html).toContain(
        status === 'error'
          ? 'subscription.managementUnavailable'
          : 'subscription.managementLoading',
      );
      state.status = 'resolved';
    },
  );
  it.each([false, true])(
    'keeps credit and history data visible: managed=%s',
    (managed) => {
      state.managed = managed;
      const usageSubscription = {
        ...subscription,
        type: 'USAGE_BASED' as const,
        monthlyCredits: 1500,
        noOfSeats: undefined,
      };
      const history = {
        ...usageSubscription,
        cancelledAt: undefined,
        status: 'ACTIVE' as const,
        isLatest: true,
      };
      const html = renderToStaticMarkup(
        <SubscriptionsTab
          orgId="org-id"
          subscription={usageSubscription}
          subscriptionHistory={[
            history,
            { ...history, id: 'other-subscription', isLatest: false },
          ]}
          activeSubscriptionCount={2}
        />,
      );
      expect(html).toContain('creditBudget.title');
      expect(html).toContain('subscription-history-row-other-subscription');
      expect(html.includes('edit-credits')).toBe(!managed);
      expect(html.includes('resolve-overlap')).toBe(!managed);
    },
  );

  it.each([false, true])(
    'keeps Academy status visible and gates the switch: managed=%s',
    (managed) => {
      state.managed = managed;
      const html = renderToStaticMarkup(<AddonsSection orgId="org-id" />);
      const document = new DOMParser().parseFromString(html, 'text/html');
      const toggle = document.querySelector('[role="switch"]');
      expect(toggle?.getAttribute('aria-checked')).toBe('true');
      expect(toggle?.hasAttribute('disabled')).toBe(managed);
    },
  );
  it.each([false, true])(
    'keeps data visible and gates manual actions: managed=%s',
    (managed) => {
      state.managed = managed;
      const html = renderToStaticMarkup(
        <SubscriptionsTab
          orgId="org-id"
          subscription={subscription}
          subscriptionHistory={[]}
          activeSubscriptionCount={1}
        />,
      );
      expect(html).toContain('Municipal Test Org');
      expect(html).toContain('licenseSeats.usedSeats');
      if (managed) {
        expect(html).toContain('subscription.managedExternally');
        expect(html).not.toContain('<button');
      } else {
        expect(html).toContain('change-package');
        expect(html).toContain('edit-seats');
        expect(html).toContain('edit-start-date');
      }
    },
  );

  it.each([false, true])(
    'gates creation when no subscription exists: managed=%s',
    (managed) => {
      state.managed = managed;
      const html = renderToStaticMarkup(
        <SubscriptionsTab
          orgId="org-id"
          subscription={null}
          subscriptionHistory={[]}
          activeSubscriptionCount={0}
        />,
      );
      expect(html.includes('create-subscription')).toBe(!managed);
      expect(html).toContain('noSubscription.title');
    },
  );
});
