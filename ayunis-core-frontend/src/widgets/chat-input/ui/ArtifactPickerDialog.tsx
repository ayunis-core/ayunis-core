import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  GitBranch,
  Loader2,
  Search,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@ayunis/ui/components/input-group';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import { Badge } from '@ayunis/ui/components/badge';
import type {
  ArtifactResponseDto,
  ArtifactResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type {
  ArtifactScope,
  ArtifactSummary,
} from '@/shared/contexts/chat/chatContext';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDate } from '@/shared/lib/format-date';
import { resolveArtifactTitle } from '@/widgets/artifact-panel-header';
import { useArtifactConversion } from '@/widgets/artifact-panel';
import { useAttachableArtifacts } from '@/widgets/chat-input/api/useAttachableArtifacts';

const artifactIcons: Record<ArtifactResponseDtoType, LucideIcon> = {
  document: FileText,
  spreadsheet: Table2,
  diagram: GitBranch,
};

interface ArtifactPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ArtifactScope;
  attachedArtifactIds: string[];
  onSelect: (artifact: ArtifactSummary) => void;
}

export function ArtifactPickerDialog({
  open,
  onOpenChange,
  onSelect,
  ...props
}: Readonly<ArtifactPickerDialogProps>) {
  const { t } = useTranslation('common');
  const requestConversion = useArtifactConversion(props.scope.workspaceId);

  /** A normal chat takes an anonymous artifact once it is converted. */
  async function select(artifact: ArtifactResponseDto) {
    if (
      artifact.isAnonymous &&
      !props.scope.isAnonymous &&
      !(await requestConversion(artifact))
    ) {
      return;
    }
    onSelect({
      id: artifact.id,
      title: resolveArtifactTitle(artifact),
      type: artifact.type,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="artifact-picker">
        <DialogHeader>
          <DialogTitle>{t('chatInput.artifactPicker.title')}</DialogTitle>
          <DialogDescription>
            {t(
              props.scope.workspaceId === null
                ? 'chatInput.artifactPicker.descriptionPersonal'
                : 'chatInput.artifactPicker.descriptionWorkspace',
            )}
          </DialogDescription>
        </DialogHeader>
        <ArtifactPickerContent
          {...props}
          onSelect={(artifact) => {
            onOpenChange(false);
            // Warns once the picker has closed, so the picker does not take
            // the focus back from the warning.
            setTimeout(() => void select(artifact));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ArtifactPickerContent({
  scope,
  attachedArtifactIds,
  onSelect,
}: Readonly<
  Omit<ArtifactPickerDialogProps, 'open' | 'onOpenChange' | 'onSelect'> & {
    onSelect: (artifact: ArtifactResponseDto) => void;
  }
>) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { artifacts, isLoading, error } = useAttachableArtifacts({
    scope,
    search: debouncedSearch || undefined,
    enabled: true,
  });
  const available = artifacts.filter(
    (artifact) => !attachedArtifactIds.includes(artifact.id),
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('chatInput.artifactPicker.searchPlaceholder')}
          aria-label={t('chatInput.artifactPicker.searchPlaceholder')}
          data-testid="artifact-picker-search"
        />
      </InputGroup>
      <ArtifactPickerList
        artifacts={available}
        showsAnonymized={!scope.isAnonymous}
        isLoading={isLoading}
        hasError={!!error}
        isSearching={debouncedSearch !== ''}
        onSelect={onSelect}
      />
    </div>
  );
}

function ArtifactPickerList({
  artifacts,
  showsAnonymized,
  isLoading,
  hasError,
  isSearching,
  onSelect,
}: Readonly<{
  artifacts: ArtifactResponseDto[];
  /** Marks the anonymous artifacts among normal ones. */
  showsAnonymized: boolean;
  isLoading: boolean;
  hasError: boolean;
  isSearching: boolean;
  onSelect: (artifact: ArtifactResponseDto) => void;
}>) {
  const { t } = useTranslation('common');
  if (isLoading) {
    return (
      <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t('common.loading')}
      </p>
    );
  }
  if (hasError) {
    return (
      <p className="py-6 text-sm text-destructive">
        {t('chatInput.artifactPicker.loadError')}
      </p>
    );
  }
  if (artifacts.length === 0) {
    return (
      <p
        className="py-6 text-sm text-muted-foreground"
        data-testid="artifact-picker-empty"
      >
        {t(
          isSearching
            ? 'chatInput.artifactPicker.noResults'
            : 'chatInput.artifactPicker.empty',
        )}
      </p>
    );
  }
  return (
    <ScrollArea className="max-h-80">
      <ItemGroup className="gap-2">
        {artifacts.map((artifact) => (
          <ArtifactPickerItem
            key={artifact.id}
            artifact={artifact}
            showsAnonymized={showsAnonymized}
            onSelect={onSelect}
          />
        ))}
      </ItemGroup>
    </ScrollArea>
  );
}

function ArtifactPickerItem({
  artifact,
  showsAnonymized,
  onSelect,
}: Readonly<{
  artifact: ArtifactResponseDto;
  showsAnonymized: boolean;
  onSelect: (artifact: ArtifactResponseDto) => void;
}>) {
  const { t } = useTranslation('artifacts');
  const Icon = artifactIcons[artifact.type];
  const title = resolveArtifactTitle(artifact);
  return (
    <Item
      asChild
      variant="outline"
      size="sm"
      className="cursor-pointer hover:bg-accent/50"
    >
      <button
        type="button"
        data-testid={`artifact-picker-item-${artifact.id}`}
        onClick={() => onSelect(artifact)}
      >
        <ItemMedia variant="icon">
          <Icon />
        </ItemMedia>
        <ItemContent className="min-w-0 text-left">
          <ItemTitle className="max-w-full">
            <span className="truncate">{title}</span>
            {showsAnonymized && artifact.isAnonymous && (
              <Badge
                variant="secondary"
                className="shrink-0"
                data-testid="artifact-picker-item-anonymized"
              >
                <ShieldCheck />
                {t('panel.anonymized')}
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>
            {t(`library.type.${artifact.type}`)} ·{' '}
            {t('library.changedAt', { date: formatDate(artifact.updatedAt) })}
          </ItemDescription>
        </ItemContent>
      </button>
    </Item>
  );
}
