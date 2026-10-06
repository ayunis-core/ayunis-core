import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PrototypeWorkspacesPage } from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/workspaces/')({
  validateSearch: searchSchema,
  component: PrototypeWorkspacesPage,
});
