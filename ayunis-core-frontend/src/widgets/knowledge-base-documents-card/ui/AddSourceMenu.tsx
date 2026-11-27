import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, Plus, Upload } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import type { AddMenuEntry } from '@/widgets/knowledge-base-documents-card/model/synced-sources';

export function AddSourceMenu({
  onUpload,
  entries = [],
  isBusy,
}: Readonly<{
  onUpload: () => void;
  entries?: AddMenuEntry[];
  isBusy: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" data-testid="knowledge-base-documents-add">
          {isBusy ? <Loader2 className="animate-spin" /> : <Plus />}
          {t('detail.documents.add')}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={handleCloseAutoFocus}>
        <DropdownMenuItem
          data-testid="knowledge-base-documents-add-upload"
          onSelect={onUpload}
        >
          <Upload />
          {t('detail.documents.addDocument')}
        </DropdownMenuItem>
        {entries.map(({ key, label, icon: Icon, testId, openDialog }) => (
          <DropdownMenuItem
            key={key}
            data-testid={testId}
            onSelect={() => requestDialogOpen(openDialog)}
          >
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
