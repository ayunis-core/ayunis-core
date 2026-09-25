import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, PenLine, Plus, Sparkles, Store } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useMyPermissions } from '@/features/permissions';
import { useMarketplaceConfig } from '@/features/marketplace';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import CreateSkillDialog from './CreateSkillDialog';

interface CreateSkillMenuProps {
  buttonText?: string;
  showIcon?: boolean;
}

export default function CreateSkillMenu({
  buttonText,
  showIcon = false,
}: Readonly<CreateSkillMenuProps>) {
  const { t } = useTranslation('skills');
  const navigate = useNavigate();
  const marketplace = useMarketplaceConfig();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  if (!isLoadingPermissions && !can('manage_skills')) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" data-testid="create-skill-menu">
            {showIcon && <Plus className="h-4 w-4" />}
            {buttonText ?? t('createDialog.buttonText')}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <DropdownMenuItem
            data-testid="create-skill-editor"
            onClick={() => requestDialogOpen(() => setIsEditorOpen(true))}
          >
            <PenLine />
            <span>{t('createMenu.editor')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            data-testid="create-skill-guided"
            onClick={() =>
              void navigate({
                to: '/chat',
                search: { prompt: t('createMenu.guidedPrompt') },
              })
            }
          >
            <Sparkles />
            <span>{t('createMenu.guided')}</span>
          </DropdownMenuItem>
          {marketplace.enabled && marketplace.url && (
            <DropdownMenuItem
              data-testid="create-skill-marketplace"
              onClick={() =>
                window.open(
                  marketplace.url ?? undefined,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <Store />
              <span>{t('createMenu.marketplace')}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateSkillDialog open={isEditorOpen} onOpenChange={setIsEditorOpen} />
    </>
  );
}
