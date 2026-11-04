import { useRouter } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { journeyFor } from '@/widgets/sharing-prototype/model/journey';
import {
  setPrototypeIteration,
  setPrototypeStep,
} from '@/widgets/sharing-prototype/model/prototype-store';

function useShowWorkspacesInIteration2(): () => void {
  const router = useRouter();
  return () => {
    const journey = journeyFor(2);
    const index = Math.max(
      journey.findIndex((step) => step.path === '/workspaces'),
      0,
    );
    const target = journey[index];
    setPrototypeIteration(2, target.role);
    setPrototypeStep(index, target.role);
    router.history.push(target.path);
  };
}

export function WorkspacesIterationNotice() {
  const showIteration2 = useShowWorkspacesInIteration2();
  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader breadcrumbs={[{ label: 'Arbeitsbereiche' }]} />
        }
        contentArea={
          <EmptyState
            title="Arbeitsbereiche bleiben in Iteration 1, wie sie sind"
            description="Verknüpfen, Personen und Teams einladen und Eigentum übertragen kommen mit Iteration 2."
            action={
              <Button variant="outline" onClick={showIteration2}>
                Iteration 2 ansehen
              </Button>
            }
          />
        }
      />
    </AppLayout>
  );
}
