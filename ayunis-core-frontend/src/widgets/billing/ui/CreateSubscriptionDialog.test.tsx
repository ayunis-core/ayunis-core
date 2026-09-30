import { fireEvent, render, screen, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Form } from '@ayunis/ui/components/form';
import {
  SubscriptionFormFields,
  type CreateSubscriptionFormData,
} from './CreateSubscriptionDialog';

function SubscriptionFormHarness() {
  const form = useForm<CreateSubscriptionFormData>({
    defaultValues: {
      companyName: '',
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: '',
      type: 'USAGE_BASED',
    },
  });

  return (
    <Form {...form}>
      <SubscriptionFormFields form={form} t={(key) => key} />
    </Form>
  );
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('subscription start date', () => {
  it('offers the next calendar year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
    render(<SubscriptionFormHarness />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'subscriptionDialog.startsAtLabel',
      }),
    );

    const yearSelect = screen.getByRole('combobox', { name: /year/i });
    expect(
      within(yearSelect).getByRole('option', { name: '2027' }),
    ).toBeTruthy();
  });
});
