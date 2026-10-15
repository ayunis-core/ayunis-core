import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LinkKind } from '@/features/workspace-links';
import type { Workspace } from '@/features/workspaces';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { WorkspaceAddMenu } from './WorkspaceAddMenu';
import { WorkspaceLinkDialog } from './WorkspaceLinkDialog';
import { linkCopyKey } from './workspace-link-copy';

export interface CreateDialogControl {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceAddControls({
  kind,
  workspace,
  createIcon,
  renderCreateDialog,
}: Readonly<{
  kind: LinkKind;
  workspace: Pick<Workspace, 'id' | 'name'>;
  createIcon: ReactNode;
  renderCreateDialog: (dialog: CreateDialogControl) => ReactNode;
}>) {
  const { t } = useTranslation('workspace');
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const copy = linkCopyKey(kind);
  const isSkill = kind === 'skill';

  return (
    <>
      <OnboardingTourTarget
        name={
          isSkill ? TOUR_TARGET.workspaceSkill : TOUR_TARGET.workspaceKnowledge
        }
      >
        <WorkspaceAddMenu
          label={t(`${copy}.addMenu`)}
          linkLabel={t(`${copy}.linkExisting`)}
          createLabel={t(`${copy}.create`)}
          createIcon={createIcon}
          testIdPrefix={isSkill ? 'workspace-skill' : 'workspace-knowledge'}
          onLinkExisting={() => setIsLinkOpen(true)}
          onCreate={() => setIsCreateOpen(true)}
        />
      </OnboardingTourTarget>
      <WorkspaceLinkDialog
        kind={kind}
        workspace={workspace}
        open={isLinkOpen}
        onOpenChange={setIsLinkOpen}
      />
      {renderCreateDialog({
        open: isCreateOpen,
        onOpenChange: setIsCreateOpen,
      })}
    </>
  );
}
