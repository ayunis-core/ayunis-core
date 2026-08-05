import { createFileRoute, redirect } from '@tanstack/react-router';
import { createAuthorization } from '@/features/permissions';
import { MeResponseDtoRole } from '@/shared/api';

export const Route = createFileRoute('/_authenticated/admin-settings/')({
  beforeLoad: ({ context: { user } }) => {
    const authorization = createAuthorization(user.role);
    if (!authorization.hasRole(MeResponseDtoRole.admin)) {
      throw redirect({ to: '/' });
    }

    throw redirect({ to: '/admin-settings/users' });
  },
});
