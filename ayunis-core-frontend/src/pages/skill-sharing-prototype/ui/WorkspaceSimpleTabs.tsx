import { FileText } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import { Textarea } from '@ayunis/ui/components/textarea';
import { showInfo, showSuccess } from '@/shared/lib/toast';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';
import { EmptyHint } from './EmptyHint';
import { ListRow } from './ListRow';

const CHAT_TIMES = ['Heute, 10:24', 'Heute, 08:51', 'Gestern', '29.09.2026'];

export function WorkspaceChatsPanel({
  workspace,
}: Readonly<{ workspace: PrototypeWorkspace }>) {
  return (
    <ItemGroup className="gap-2">
      {workspace.chats.map((chat, index) => (
        <ListRow
          key={chat.id}
          title={chat.title}
          description={CHAT_TIMES[index % CHAT_TIMES.length]}
          onClick={() =>
            showInfo('Chats lassen sich im Prototyp nicht öffnen.')
          }
        />
      ))}
    </ItemGroup>
  );
}

export function WorkspaceArtifactsPanel({
  workspace,
}: Readonly<{ workspace: PrototypeWorkspace }>) {
  if (workspace.artifacts.length === 0) {
    return (
      <EmptyHint icon={<FileText />} title="Noch keine erstellten Inhalte" />
    );
  }
  return (
    <ItemGroup className="gap-2">
      {workspace.artifacts.map((artifact) => (
        <ListRow
          key={artifact.id}
          title={artifact.title}
          description={`${artifact.kind} · ${artifact.updatedAt}`}
          onClick={() =>
            showInfo('Inhalte lassen sich im Prototyp nicht öffnen.')
          }
        />
      ))}
    </ItemGroup>
  );
}

export function WorkspaceInstructionsPanel({
  workspace,
  canEdit,
}: Readonly<{ workspace: PrototypeWorkspace; canEdit: boolean }>) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          rows={5}
          aria-label="Anweisungen"
          defaultValue={workspace.instructions}
          disabled={!canEdit}
        />
        <p className="text-xs text-muted-foreground">
          Gilt für jeden Chat im Arbeitsbereich.
        </p>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => showSuccess('Anweisung gespeichert.')}
          >
            Speichern
          </Button>
        </div>
      )}
    </div>
  );
}
