import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Link2, Unlink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import {
  OwnerMeta,
  useLinkedItems,
  useUnlinkItem,
  type LinkedItem,
  type LinkKind,
} from '@/features/workspace-links';
import type { Workspace } from '@/features/workspaces';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import { KnowledgeBaseListItem } from '@/shared/ui/knowledge-base-list-item';
import { SkillListItem } from '@/shared/ui/skill-list-item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { linkCopyKey } from './workspace-link-copy';
import { SectionLoading } from './SectionLoading';

type WorkspaceRef = Pick<Workspace, 'id' | 'name'>;

function UnlinkButton({
  kind,
  workspace,
  item,
}: Readonly<{ kind: LinkKind; workspace: WorkspaceRef; item: LinkedItem }>) {
  const { t } = useTranslation('workspace');
  const { confirm } = useConfirmation();
  const unlink = useUnlinkItem(kind, workspace.id);
  const label = t('links.unlink.label');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={unlink.isPending}
          data-testid={`workspace-unlink-${item.id}`}
          onClick={() =>
            confirm({
              title: t('links.unlink.title'),
              description: t(`${linkCopyKey(kind)}.unlinkDescription`, {
                workspace: workspace.name,
                name: item.name,
              }),
              confirmText: t('links.unlink.confirm'),
              cancelText: t('links.unlink.cancel'),
              onConfirm: () => unlink.mutate({ id: item.id, name: item.name }),
            })
          }
        >
          <Unlink />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function WorkspaceLinkedSection({
  kind,
  workspace,
}: Readonly<{ kind: LinkKind; workspace: WorkspaceRef }>) {
  const { t } = useTranslation('workspace');
  const navigate = useNavigate();
  const { items, isLoading } = useLinkedItems(kind, workspace.id);
  const copy = linkCopyKey(kind);
  const Row = kind === 'skill' ? SkillListItem : KnowledgeBaseListItem;

  function open(item: LinkedItem) {
    void (kind === 'skill'
      ? navigate({ to: '/skills/$id', params: { id: item.id } })
      : navigate({ to: '/knowledge-bases/$id', params: { id: item.id } }));
  }

  return (
    <ListSection
      title={t('links.sections.linked')}
      count={isLoading ? undefined : items.length}
      testId={`workspace-linked-${kind}`}
    >
      {isLoading && (
        <SectionLoading testId={`workspace-linked-${kind}-loading`} />
      )}
      {!isLoading && items.length === 0 && (
        <EmptyHint
          icon={<Link2 />}
          title={t(`${copy}.emptyLinkedTitle`)}
          description={t(`${copy}.emptyLinked`)}
        />
      )}
      {items.map((item) => (
        <Row
          key={item.id}
          testId={`workspace-linked-item-${item.id}`}
          title={item.name}
          description={item.description}
          onClick={() => open(item)}
          actions={
            <>
              <OwnerMeta item={item} />
              <UnlinkButton kind={kind} workspace={workspace} item={item} />
            </>
          }
        />
      ))}
    </ListSection>
  );
}
