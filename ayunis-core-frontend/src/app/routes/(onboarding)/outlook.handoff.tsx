import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import { SessionHandoffRequestDtoClient } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const searchSchema = z.object({
  client: z.enum(SessionHandoffRequestDtoClient),
});

// The handoff page is a separate document that loads Office.js, which the
// SPA must not carry, so leave the app with a full page load.
export const Route = createFileRoute('/(onboarding)/outlook/handoff')({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      href: `/outlook/dialog.html?client=${search.client}`,
      reloadDocument: true,
    });
  },
});
