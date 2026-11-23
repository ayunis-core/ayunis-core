import {
  configureApiTransport,
  createApiTransport,
} from '@ayunis/api-client/transport';

configureApiTransport(
  createApiTransport({
    baseUrl: 'http://localhost:3000/api',
    credentials: 'include',
  }),
);
