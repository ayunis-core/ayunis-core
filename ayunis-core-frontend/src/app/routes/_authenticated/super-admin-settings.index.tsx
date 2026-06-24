import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/super-admin-settings/')({
  beforeLoad: ({ context: { user } }) => {
    if (user.systemRole !== MeResponseDtoSystemRole.super_admin) {
      throw redirect({ to: '/' });
    }

    throw redirect({ to: '/super-admin-settings/orgs' });
  },
});
