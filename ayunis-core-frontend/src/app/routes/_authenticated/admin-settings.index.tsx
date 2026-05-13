import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin-settings/')({
  beforeLoad: ({ context: { user } }) => {
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      throw redirect({ to: '/' });
    }

    throw redirect({ to: '/admin-settings/users' });
  },
});
