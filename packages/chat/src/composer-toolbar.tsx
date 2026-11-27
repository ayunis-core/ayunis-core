import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ACCEPTED_AUDIO_PICKER_TYPES,
  ACCEPTED_FILE_PICKER_TYPES,
} from './composer/document-upload-policy';
import { useTranslation } from 'react-i18next';
import { ArrowUp, AudioLines, Paperclip, Plus, Square } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export function ComposerToolbar({
  leading,
  model,
  trailing,
}: Readonly<{ leading: ReactNode; model: ReactNode; trailing: ReactNode }>) {
  return (
    <div
      data-testid="chat-input-toolbar"
      className="flex min-w-0 items-center gap-1 sm:gap-2"
    >
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">{leading}</div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
        <div className="min-w-0">{model}</div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {trailing}
        </div>
      </div>
    </div>
  );
}

export function AttachmentMenu({
  disabled,
  closeMenu,
  onFiles,
  onAudio,
  accept = ACCEPTED_FILE_PICKER_TYPES,
  menuActions,
}: Readonly<{
  disabled: boolean;
  closeMenu: boolean;
  onFiles?: (files: File[]) => void;
  onAudio?: (files: File[]) => void;
  accept?: string;
  menuActions?: ReactNode;
}>) {
  const files = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLInputElement>(null);

  return (
    <>
      <AttachmentInput
        inputRef={files}
        testId="chat-file-upload-input"
        accept={accept}
        disabled={disabled}
        onFiles={onFiles}
      />
      {onAudio && (
        <AttachmentInput
          inputRef={audio}
          accept={ACCEPTED_AUDIO_PICKER_TYPES}
          disabled={disabled}
          onFiles={onAudio}
        />
      )}
      <AttachmentMenuTrigger
        disabled={disabled || (!onFiles && !menuActions)}
        closeMenu={closeMenu}
        onPick={() => files.current?.click()}
        onPickAudio={onAudio && (() => audio.current?.click())}
        hasFiles={Boolean(onFiles)}
        menuActions={menuActions}
      />
    </>
  );
}

function AttachmentInput({
  inputRef,
  disabled,
  accept,
  testId,
  onFiles,
}: Readonly<{
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  accept?: string;
  testId?: string;
  onFiles?: (files: File[]) => void;
}>) {
  return (
    <input
      ref={inputRef}
      type="file"
      hidden
      multiple
      accept={accept}
      data-testid={testId}
      disabled={disabled || !onFiles}
      onChange={({ currentTarget: input }) => {
        onFiles?.(Array.from(input.files ?? []));
        input.value = '';
      }}
    />
  );
}

function AttachmentMenuTrigger({
  disabled,
  closeMenu,
  onPick,
  onPickAudio,
  hasFiles,
  menuActions,
}: Readonly<{
  disabled: boolean;
  closeMenu: boolean;
  onPick: () => void;
  onPickAudio?: () => void;
  hasFiles: boolean;
  menuActions?: ReactNode;
}>) {
  const { t } = useTranslation('common');
  const label = t('chatInput.addButtonTooltip');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (disabled || closeMenu) setOpen(false);
  }, [closeMenu, disabled]);
  return (
    <Tooltip>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              disabled={disabled}
              aria-label={label}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <AttachmentUploadItems
            hasFiles={hasFiles}
            onPick={onPick}
            onPickAudio={onPickAudio}
          />
          {menuActions}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function AttachmentUploadItems({
  hasFiles,
  onPick,
  onPickAudio,
}: Readonly<{
  hasFiles: boolean;
  onPick: () => void;
  onPickAudio?: () => void;
}>) {
  const { t } = useTranslation('common');
  if (!hasFiles && !onPickAudio) return null;
  return (
    <DropdownMenuGroup>
      {hasFiles && (
        <DropdownMenuItem onSelect={onPick}>
          <Paperclip className="h-4 w-4" />
          <span>{t('chatInput.uploadFile')}</span>
        </DropdownMenuItem>
      )}
      {onPickAudio && (
        <DropdownMenuItem onSelect={onPickAudio}>
          <AudioLines className="h-4 w-4" />
          <span>{t('chatInput.uploadAudio')}</span>
        </DropdownMenuItem>
      )}
    </DropdownMenuGroup>
  );
}

export function ToolbarSendButton({
  isStreaming,
  canSend,
  submit,
  onStop,
}: Readonly<{
  isStreaming: boolean;
  canSend: boolean;
  submit: () => void;
  onStop?: () => void;
}>) {
  const { t } = useTranslation('common');
  const readyState = canSend ? 'ready' : 'disabled';
  const state = isStreaming ? 'stop' : readyState;
  const label = t(
    isStreaming ? 'chatInput.cancelTooltip' : 'chatInput.sendTooltip',
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            type="button"
            size="icon"
            className={`chat-input-send-button chat-input-send-button--${state} rounded-full`}
            aria-label={label}
            data-testid={isStreaming ? 'cancel' : 'send'}
            disabled={isStreaming ? !onStop : !canSend}
            onClick={isStreaming ? onStop : submit}
          >
            {isStreaming ? (
              <Square className="h-4 w-4" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
