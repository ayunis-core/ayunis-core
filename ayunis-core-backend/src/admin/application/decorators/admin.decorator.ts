import { SetMetadata } from '@nestjs/common';

export const ADMIN_KEY = 'isAdmin';
export const Admin = () => SetMetadata(ADMIN_KEY, true);
