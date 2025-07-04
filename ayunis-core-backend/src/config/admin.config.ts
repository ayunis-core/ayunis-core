import { registerAs } from '@nestjs/config';

export const adminConfig = registerAs('admin', () => ({
  adminToken: process.env.ADMIN_TOKEN || 'admin-token',
}));
