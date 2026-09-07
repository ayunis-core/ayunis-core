import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CreditLimitDialog } from './CreditLimitDialog';

const api = vi.hoisted(() => ({
  setUser: vi.fn(),
  setTeam: vi.fn(),
  removeUser: vi.fn(),
  removeTeam: vi.fn(),
  showError: vi.fn(),
}));
vi.mock('@/shared/api', () => ({
  creditLimitsControllerSetUserLimit: api.setUser,
  creditLimitsControllerSetTeamLimit: api.setTeam,
  creditLimitsControllerRemoveUserLimit: api.removeUser,
  creditLimitsControllerRemoveTeamLimit: api.removeTeam,
  getCreditLimitsControllerGetUserLimitsQueryKey: () => ['user-limits'],
  getCreditLimitsControllerGetTeamLimitsQueryKey: () => ['team-limits'],
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: api.showError,
  showSuccess: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function DialogHarness({
  initialLimit,
  target,
}: Readonly<{ initialLimit: number | null; target: 'teams' | 'users' }>) {
  const [open, setOpen] = useState(true);
  return open ? (
    <CreditLimitDialog
      target={target}
      id="target"
      name="Alice"
      initialLimit={initialLimit}
      onClose={() => setOpen(false)}
    />
  ) : null;
}

function renderDialog(
  initialLimit: number | null,
  target: 'teams' | 'users' = 'users',
) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DialogHarness initialLimit={initialLimit} target={target} />
    </QueryClientProvider>,
  );
}

describe('CreditLimitDialog', () => {
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
  afterAll(() => vi.unstubAllGlobals());
  beforeEach(() => vi.resetAllMocks());
  it('shows only one amount field, saves zero explicitly and closes', async () => {
    const saved = new Map<string, number>();
    api.setUser.mockImplementation(
      async (id: string, data: { monthlyCredits: number }) =>
        saved.set(id, data.monthlyCredits),
    );
    renderDialog(0);
    expect(screen.getByRole('dialog', { name: 'Alice' })).toBeTruthy();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(
      screen.getByTestId<HTMLInputElement>('credit-limit-input').value,
    ).toBe('0');
    expect(saved.size).toBe(0);
    fireEvent.click(screen.getByTestId('credit-limit-save'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(saved.get('target')).toBe(0);
  });
  it.each(['', '-1'])(
    'rejects invalid amount %s inline without saving',
    async (value) => {
      renderDialog(null);
      fireEvent.change(screen.getByTestId('credit-limit-input'), {
        target: { value },
      });
      fireEvent.click(screen.getByTestId('credit-limit-save'));
      expect(
        await screen.findByText('validation.monthlyCredits.invalid'),
      ).toBeTruthy();
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(api.setUser).not.toHaveBeenCalled();
      expect(screen.queryByTestId('credit-limit-remove')).toBeNull();
    },
  );
  it('cancels unsaved changes', () => {
    renderDialog(12);
    fireEvent.change(screen.getByTestId('credit-limit-input'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByTestId('credit-limit-cancel'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.setUser).not.toHaveBeenCalled();
  });
  it('removes an existing zero team limit even when the edited input is invalid', async () => {
    const limits = new Map([['target', 0]]);
    api.removeTeam.mockImplementation(async (id: string) => limits.delete(id));
    renderDialog(0, 'teams');
    const remove = screen.getByRole('button', { name: 'form.remove' });
    expect(remove.getAttribute('data-variant')).toBe('destructive');
    expect(remove.getAttribute('data-size')).toBe('icon');
    expect(remove.textContent).toBe('');
    expect(remove.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    fireEvent.change(screen.getByTestId('credit-limit-input'), {
      target: { value: '-1' },
    });
    fireEvent.click(screen.getByTestId('credit-limit-remove'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(limits.has('target')).toBe(false);
    expect(api.setTeam).not.toHaveBeenCalled();
  });
  it('explains the removal icon with a keyboard-accessible tooltip', async () => {
    renderDialog(5);
    fireEvent.focus(screen.getByRole('button', { name: 'form.remove' }));
    expect((await screen.findByRole('tooltip')).textContent).toBe(
      'form.remove',
    );
  });
  it('keeps rejected backend amounts and field errors visible', async () => {
    api.setUser.mockRejectedValue(
      new AxiosError('Invalid', undefined, undefined, undefined, {
        data: { code: 'INVALID_CREDIT_LIMIT', message: 'Invalid' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );
    renderDialog(5);
    fireEvent.change(screen.getByTestId('credit-limit-input'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByTestId('credit-limit-save'));
    expect(
      await screen.findByText('validation.monthlyCredits.invalid'),
    ).toBeTruthy();
    expect(
      screen.getByTestId<HTMLInputElement>('credit-limit-input').value,
    ).toBe('15');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('keeps the dialog open and reports a network failure', async () => {
    api.setUser.mockRejectedValue(new Error('Offline'));
    renderDialog(5);
    fireEvent.click(screen.getByTestId('credit-limit-save'));
    await waitFor(() =>
      expect(api.showError).toHaveBeenCalledWith('creditLimits.set.error'),
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it.each(['save', 'remove'])(
    'blocks dismissal and repeated actions during %s',
    async (action) => {
      let finish!: () => void;
      const request = new Promise<void>((resolve) => {
        finish = resolve;
      });
      (action === 'save' ? api.setUser : api.removeUser).mockReturnValue(
        request,
      );
      renderDialog(5);
      fireEvent.click(screen.getByTestId(`credit-limit-${action}`));
      await waitFor(() =>
        expect(
          screen.getByTestId<HTMLButtonElement>('credit-limit-cancel').disabled,
        ).toBe(true),
      );
      fireEvent.click(screen.getByTestId('credit-limit-cancel'));
      fireEvent.keyDown(screen.getByRole('dialog'), {
        key: 'Escape',
        code: 'Escape',
      });
      fireEvent.click(screen.getByTestId(`credit-limit-${action}`));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(
        action === 'save' ? api.setUser : api.removeUser,
      ).toHaveBeenCalledOnce();
      await act(async () => finish());
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    },
  );
  it('initializes a fresh amount when mounted again', () => {
    const first = renderDialog(5);
    fireEvent.change(screen.getByTestId('credit-limit-input'), {
      target: { value: '99' },
    });
    first.unmount();
    renderDialog(20);
    expect(
      screen.getByTestId<HTMLInputElement>('credit-limit-input').value,
    ).toBe('20');
  });
});
