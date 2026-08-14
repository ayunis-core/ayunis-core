import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';
import { useWorkspaceContextControllerFindContext } from '@/shared/api/generated/ayunisCoreAPI';
import { useWorkspaceContextActions } from '@/pages/workspace/api/useWorkspaceContextActions';
import { WorkspaceContextSection } from './WorkspaceContextList';

export function WorkspaceInstructionsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const { updateInstruction, isSavingInstruction } =
    useWorkspaceContextActions(workspaceId);
  const {
    data: context,
    isLoading,
    error,
  } = useWorkspaceContextControllerFindContext(workspaceId);
  const [value, setValue] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const hasLoadedInstruction = useRef(false);

  useEffect(() => {
    if (!context || isDirty || hasLoadedInstruction.current) return;
    hasLoadedInstruction.current = true;
    setValue(context.instruction ?? '');
  }, [context, isDirty]);

  if (isLoading) return <p>{t('context.addDialog.loading')}</p>;
  if (error || !context) return <WorkspaceContextLoadError />;

  return (
    <WorkspaceContextSection
      title={t('context.instructions.title')}
      description={t('context.instructions.description')}
    >
      <Textarea
        value={value}
        data-testid="workspace-instruction-input"
        onChange={(event) => {
          setValue(event.target.value);
          setIsDirty(true);
        }}
        placeholder={t('context.instructions.placeholder')}
        rows={8}
      />
      <div className="flex justify-end">
        <Button
          data-testid="workspace-instruction-save"
          disabled={isSavingInstruction || !isDirty}
          onClick={() => {
            const instruction = value.trim() || null;
            void updateInstruction(instruction).then(() => {
              setIsDirty(false);
            });
          }}
        >
          {t('context.instructions.save')}
        </Button>
      </div>
    </WorkspaceContextSection>
  );
}

function WorkspaceContextLoadError() {
  const { t } = useTranslation('workspace');

  return (
    <Alert variant="warning">
      <AlertTitle>{t('context.loadError.title')}</AlertTitle>
      <AlertDescription>{t('context.loadError.description')}</AlertDescription>
    </Alert>
  );
}
