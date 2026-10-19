import { registerAs } from '@nestjs/config';

export const coreConnectConfig = registerAs('coreConnect', () => ({
  serviceToken: process.env.CORE_CONNECT_SERVICE_TOKEN,
}));
