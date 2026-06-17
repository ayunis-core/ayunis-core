import { createFileRoute } from '@tanstack/react-router';
import { IpBlockedPage } from '@/pages/auth/ip-blocked';

export const Route = createFileRoute('/(onboarding)/ip-blocked')({
  component: IpBlockedPage,
});
