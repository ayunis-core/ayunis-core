import { Unlink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type { ResourceKind } from '@/widgets/sharing-prototype/model/types';
import { RESOURCE_NOUN } from '@/pages/skill-sharing-prototype/lib/requests';

export function UnlinkButton({
  itemName,
  workspaceName,
  resource,
  onUnlink,
}: Readonly<{
  itemName: string;
  workspaceName: string;
  resource: ResourceKind;
  onUnlink: () => void;
}>) {
  const { confirm } = useConfirmation();
  const noun = RESOURCE_NOUN[resource];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Verknüpfung lösen"
          onClick={() =>
            confirm({
              title: 'Verknüpfung lösen?',
              description: `Danach können die Mitglieder von „${workspaceName}“ „${itemName}“ hier nicht mehr nutzen. Die ${noun} selbst bleibt erhalten und lässt sich jederzeit wieder verknüpfen.`,
              confirmText: 'Verknüpfung lösen',
              cancelText: 'Abbrechen',
              onConfirm: onUnlink,
            })
          }
        >
          <Unlink />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Verknüpfung lösen</TooltipContent>
    </Tooltip>
  );
}
