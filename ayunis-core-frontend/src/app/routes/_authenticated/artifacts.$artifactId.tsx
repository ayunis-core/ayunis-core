import { createFileRoute } from '@tanstack/react-router';
import { ArtifactPage } from '@/pages/artifact';

export const Route = createFileRoute('/_authenticated/artifacts/$artifactId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { artifactId } = Route.useParams();
  return <ArtifactPage key={artifactId} artifactId={artifactId} />;
}
