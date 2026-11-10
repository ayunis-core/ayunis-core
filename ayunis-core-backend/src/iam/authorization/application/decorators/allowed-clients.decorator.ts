import { SetMetadata } from '@nestjs/common';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export const ALLOWED_CLIENTS_KEY = 'allowedClients';

export const AllowedClients = (...clients: SessionClient[]) =>
  SetMetadata(ALLOWED_CLIENTS_KEY, clients);
