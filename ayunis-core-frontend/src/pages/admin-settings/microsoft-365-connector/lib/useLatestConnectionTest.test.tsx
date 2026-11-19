import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConnectorStatus,
  Microsoft365ConnectionTestOutcome,
  type Microsoft365ConnectionTestResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { Microsoft365ConnectorFormValues } from '@/pages/admin-settings/microsoft-365-connector/model/microsoft365ConnectorFormSchema';
import { useSaveMicrosoft365Connector } from '@/pages/admin-settings/microsoft-365-connector/api/useSaveMicrosoft365Connector';
import { useTestMicrosoft365Connection } from '@/pages/admin-settings/microsoft-365-connector/api/useTestMicrosoft365Connection';
import { useRemoveMicrosoft365Connector } from '@/pages/admin-settings/microsoft-365-connector/api/useRemoveMicrosoft365Connector';
import { useLatestConnectionTest } from './useLatestConnectionTest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/shared/api/client', () => ({ customAxiosInstance: request }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const IDS = {
  tenantId: '6f1c2c4e-3c1a-4f4e-9a59-2f1f0b8a7d11',
  clientId: '0b8a7d11-2f1f-4f4e-9a59-6f1c2c4e3c1a',
};

function testResult(
  outcome: Microsoft365ConnectionTestOutcome,
): Microsoft365ConnectionTestResponseDto {
  return {
    outcome,
    permissions: [],
    otherGrantedPermissions: [],
    entraErrorCode: null,
  };
}

const OLDER = testResult(Microsoft365ConnectionTestOutcome.consent_missing);
const NEWER = testResult(Microsoft365ConnectionTestOutcome.connected);

let client: QueryClient;
let answers: ((result: unknown) => void)[];

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderPage() {
  return renderHook(
    () => {
      const latest = useLatestConnectionTest();
      const form = useForm<Microsoft365ConnectorFormValues>({
        defaultValues: { ...IDS, clientSecret: '' },
      });
      return {
        connectionTest: latest.connectionTest,
        test: useTestMicrosoft365Connection(latest.startRequest),
        save: useSaveMicrosoft365Connector(form, latest.startRequest),
        remove: useRemoveMicrosoft365Connector(latest.clearConnectionTest),
      };
    },
    { wrapper },
  );
}

async function answer(index: number, result?: unknown) {
  await act(async () => {
    answers[index](result);
    await Promise.resolve();
  });
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  answers = [];
  request.mockImplementation(
    () => new Promise((resolve) => answers.push(resolve)),
  );
});

afterEach(() => {
  cleanup();
  client.clear();
});

describe('useLatestConnectionTest', () => {
  it('keeps the result of a newer re-test when an older test answers last', async () => {
    const { result } = renderPage();

    act(() => result.current.test.testConnection());
    act(() => result.current.test.testConnection());
    await vi.waitFor(() => expect(answers).toHaveLength(2));
    await answer(1, NEWER);
    await answer(0, OLDER);

    expect(result.current.connectionTest).toEqual(NEWER);
  });

  it('keeps the result of a newer save when an older test answers last', async () => {
    const { result } = renderPage();

    act(() => result.current.test.testConnection());
    act(() => result.current.save.saveConnector({ ...IDS, clientSecret: '' }));
    await vi.waitFor(() => expect(answers).toHaveLength(2));
    await answer(1, {
      ...IDS,
      status: ConnectorStatus.set_up,
      connectionTest: NEWER,
    });
    await answer(0, OLDER);

    expect(result.current.connectionTest).toEqual(NEWER);
  });

  it('shows no result when a test answers after the connection was removed', async () => {
    const { result } = renderPage();

    act(() => result.current.test.testConnection());
    act(() => result.current.remove.mutate());
    await vi.waitFor(() => expect(answers).toHaveLength(2));
    await answer(1);
    await answer(0, OLDER);

    expect(result.current.connectionTest).toBeNull();
  });
});
