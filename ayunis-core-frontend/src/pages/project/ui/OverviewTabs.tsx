import { useState } from 'react';
import { Plus, X, Star, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { TabsTrigger } from '@/shared/ui/shadcn/tabs';
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { GeneratedContentRows } from './GeneratedContentRows';
import {
  updateProjectPrompt,
  type MockProject,
  type ProjectChat,
} from '@/entities/project';

export function TabTriggerWithCount({
  value,
  label,
  count,
}: Readonly<{ value: string; label: string; count: number }>) {
  return (
    <TabsTrigger value={value} className="gap-1.5">
      {label}
      <Badge variant="secondary" className="text-[10px] px-1.5">
        {count}
      </Badge>
    </TabsTrigger>
  );
}

export function InstructionsTab({
  project,
  canManage = true,
}: Readonly<{ project: MockProject; canManage?: boolean }>) {
  const [prompt, setPrompt] = useState(project.prompt ?? '');
  const isDirty = prompt !== (project.prompt ?? '');

  if (!canManage) {
    return project.prompt ? (
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
        {project.prompt}
      </p>
    ) : (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Für dieses Projekt sind keine Anweisungen hinterlegt.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="z. B. „Antworte in einfacher Amtssprache. Verweise bei Gebührenfragen immer auf die aktuelle Gebührensatzung. Nenne bei Fristen das zuständige Amt."
        className="min-h-64 resize-y"
      />
      <p className="text-sm text-muted-foreground">
        Tonfall, Vorgaben oder spezifisches Wissen — wird in jedem Chat dieses
        Projekts automatisch berücksichtigt.
      </p>
      <Button
        size="sm"
        className="mt-2 self-start"
        disabled={!isDirty}
        onClick={() => updateProjectPrompt(project.id, prompt)}
      >
        Speichern
      </Button>
    </div>
  );
}

export function ChatsTab({
  project,
  onOpenChat,
  onRemoveChat,
}: Readonly<{
  project: MockProject;
  onOpenChat: (id: string) => void;
  onRemoveChat: (id: string) => void;
}>) {
  const { t } = useTranslation('chats');
  const { confirm } = useConfirmation();

  if (project.chats.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Chats. Schreiben Sie oben einfach los.
      </p>
    );
  }
  const sortedChats = [...project.chats].sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false),
  );

  function handleDelete(event: React.MouseEvent, chat: ProjectChat) {
    event.stopPropagation();
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', { title: chat.title }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => onRemoveChat(chat.id),
    });
  }

  return (
    <div className="space-y-3">
      {sortedChats.map((chat) => (
        <Item
          key={chat.id}
          variant="outline"
          className="cursor-pointer"
          onClick={() => onOpenChat(chat.id)}
        >
          <ItemContent>
            <ItemTitle>
              <span>{chat.title}</span>
              {chat.pinned && <Star className="size-3 fill-brand text-brand" />}
            </ItemTitle>
            {chat.messages.length > 0 && (
              <ItemDescription className="line-clamp-1">
                {chat.messages[chat.messages.length - 1].text}
              </ItemDescription>
            )}
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(event) => handleDelete(event, chat)}
              aria-label={t('card.confirmDelete.title')}
            >
              <Trash2 />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </div>
  );
}

interface ListTabProps {
  heading: string;
  hint?: string;
  addLabel: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
  emptyText: string;
  rows: { id: string; title: string; description?: string }[];
  canManage?: boolean;
}

export function ListTab({
  heading,
  hint,
  addLabel,
  onAdd,
  onRemove,
  emptyText,
  rows,
  canManage = true,
}: Readonly<ListTabProps>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {heading}
          {hint && <span className="ml-1.5 font-normal">({hint})</span>}
        </h3>
        {canManage && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus /> {addLabel}
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ItemGroup className="gap-3">
          {rows.map((row) => (
            <Item key={row.id} variant="outline">
              <ItemContent>
                <ItemTitle>
                  <span>{row.title}</span>
                </ItemTitle>
                {row.description && (
                  <ItemDescription>{row.description}</ItemDescription>
                )}
              </ItemContent>
              {canManage && (
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(row.id)}
                    aria-label={`${row.title} aus dem Projekt entfernen`}
                  >
                    <X />
                  </Button>
                </ItemActions>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}
    </div>
  );
}

export function GeneratedDocumentsTab({
  project,
  onOpenChat,
  onToggleShared,
  onRemove,
}: Readonly<{
  project: MockProject;
  onOpenChat: (chatId: string, artifactId: string) => void;
  onToggleShared?: (id: string) => void;
  onRemove: (id: string) => void;
}>) {
  const docs = project.generatedDocuments ?? [];

  if (docs.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Hier erscheinen Inhalte, die Ayunis Core in Ihren Chats für Sie erstellt
        hat.
      </p>
    );
  }
  return (
    <GeneratedContentRows
      documents={docs}
      onOpenChat={onOpenChat}
      onToggleShared={onToggleShared}
      onRemove={onRemove}
    />
  );
}

export function DocumentsTab({
  project,
  onRemove,
  canManage = true,
}: Readonly<{
  project: MockProject;
  onRemove: (id: string) => void;
  canManage?: boolean;
}>) {
  return (
    <div className="flex flex-col gap-3">
      {project.documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch keine Dateien in diesem Projekt.
        </p>
      ) : (
        <ItemGroup className="gap-3">
          {project.documents.map((doc) => (
            <Item key={doc.id} variant="outline">
              <ItemContent>
                <ItemTitle>
                  <span>{doc.name}</span>
                </ItemTitle>
              </ItemContent>
              {canManage && (
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(doc.id)}
                    aria-label={`${doc.name} aus dem Projekt entfernen`}
                  >
                    <X />
                  </Button>
                </ItemActions>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}
    </div>
  );
}
