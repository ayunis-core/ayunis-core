import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LibraryPage } from '@/pages/library';
import { ArtifactsControllerFindPersonalType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  search: searchParamString.optional(),
  type: z.enum(ArtifactsControllerFindPersonalType).optional().catch(undefined),
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute('/_authenticated/library/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { search, type, page = 1 } = Route.useSearch();
  return <LibraryPage search={search} type={type} page={page} />;
}
