import { checkIn } from '@appsignal/nodejs';

export function startBackendProcessHeartbeat(): void {
  checkIn.heartbeat('backend_process', { continuous: true });
}
