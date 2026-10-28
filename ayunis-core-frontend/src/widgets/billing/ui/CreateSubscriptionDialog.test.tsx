import type { CreateSubscriptionFormData } from '@/widgets/billing/model/types';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Form } from '@ayunis/ui/components/form';
import { SubscriptionFormFields } from './CreateSubscriptionDialog';
import SubscriptionDateField from './SubscriptionDateField';

const emptyFormValues: CreateSubscriptionFormData = {
  companyName: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  country: '',
  type: 'USAGE_BASED',
};

function SubscriptionFormHarness() {
  const form = useForm<CreateSubscriptionFormData>({
    defaultValues: emptyFormValues,
  });

  return (
    <Form {...form}>
      <SubscriptionFormFields form={form} t={(key) => key} />
    </Form>
  );
}

function EndDateHarness({ startsAt }: Readonly<{ startsAt: string }>) {
  const form = useForm<CreateSubscriptionFormData>({
    defaultValues: { ...emptyFormValues, startsAt },
  });

  return (
    <Form {...form}>
      <SubscriptionDateField form={form} t={(key) => key} name="endsAt" />
    </Form>
  );
}

function yearOptionsOf(pickerLabel: string): string[] {
  fireEvent.click(screen.getByRole('button', { name: pickerLabel }));
  const yearSelect = screen.getByRole('combobox', { name: /year/i });
  return within(yearSelect)
    .getAllByRole('option')
    .map((option) => option.textContent ?? '');
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

    expect(yearOptionsOf('subscriptionDialog.startsAtLabel')).toContain('2027');
  });
});

describe('subscription end date', () => {
  it('reaches multi-year terms beyond the start date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
    render(<EndDateHarness startsAt="2027-06-01T00:00:00.000Z" />);

    const years = yearOptionsOf('subscriptionDialog.endsAtLabel');

    expect(years).toContain('2029');
    expect(years).toContain('2032');
    expect(years).not.toContain('2033');
  });
});
