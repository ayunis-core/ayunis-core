import { sessionHandoffControllerHandoff } from '@ayunis/api-client/endpoints';
import type { SessionHandoffRequestDtoClient } from '@ayunis/api-client/schemas';
import {
  configureApiTransport,
  createApiTransport,
} from '@ayunis/api-client/transport';
import { isAxiosError } from 'axios';
import type { OfficeDialogMessage } from './dialog-message';
import { officeReady, officeUi } from './office';

export type OfficeSessionHandoffConfig = {
  apiBaseUrl: string;
  client: SessionHandoffRequestDtoClient;
  statusElement: HTMLElement | null;
  copy: () => {
    connectingText: string;
    officeRequiredText: string;
  };
};

export async function handOverOfficeSession(
  config: OfficeSessionHandoffConfig,
): Promise<void> {
  const ready = await officeReady().then(
    () => true,
    () => false,
  );
  const copy = config.copy();
  const ui = officeUi();
  if (!ready || typeof ui?.messageParent !== 'function') {
    setStatus(config.statusElement, copy.officeRequiredText);
    return;
  }
  setStatus(config.statusElement, copy.connectingText);
  configureApiTransport(
    createApiTransport({ baseUrl: config.apiBaseUrl, credentials: 'include' }),
  );
  ui.messageParent(JSON.stringify(await handoff(config.client)));
}

async function handoff(
  expectedClient: SessionHandoffRequestDtoClient,
): Promise<OfficeDialogMessage> {
  const client = new URLSearchParams(window.location.search).get('client');
  if (client !== expectedClient) {
    return { type: 'error', code: 'UNKNOWN_CLIENT' };
  }
  try {
    const tokens = await sessionHandoffControllerHandoff({
      client: expectedClient,
    });
    return { type: 'session', ...tokens };
  } catch (error) {
    return { type: 'error', code: errorCode(error) };
  }
}

function setStatus(element: HTMLElement | null, message: string): void {
  if (element) element.textContent = message;
}

function errorCode(error: unknown): string {
  if (!isAxiosError<{ code?: string } | null>(error)) return 'NETWORK_ERROR';
  return error.response?.data?.code ?? 'UNKNOWN_ERROR';
}
