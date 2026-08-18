import { AlertCircle, Mail, Save, Send, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import type { ArtifactResponseDto } from '@/shared/api';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { VersionHistory } from '@/widgets/artifact-editor';
import {
  EMPTY_EMAIL_CONTENT,
  formatRecipients,
  isValidEmailContent,
  parseEmailContent,
  parseRecipients,
  serializeEmailContent,
  type EditableEmailContent,
} from '../model/email-content';

interface EmailEditorProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void | Promise<void>;
  readonly onRevert: (versionNumber: number) => void;
  readonly onClose: () => void;
  readonly onSend: () => void | Promise<void>;
  readonly isSending?: boolean;
}

export function EmailEditor({
  artifact,
  onSave,
  onRevert,
  onClose,
  onSend,
  isSending = false,
}: EmailEditorProps) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  const currentVersion = findVersion(artifact, artifact.currentVersionNumber);
  const initialContent = parseEmailContent(currentVersion?.content ?? '');
  const [draft, setDraft] = useState<EditableEmailContent>(
    initialContent ?? EMPTY_EMAIL_CONTENT,
  );
  const [displayedVersionNumber, setDisplayedVersionNumber] = useState(
    artifact.currentVersionNumber,
  );
  const [baseContent, setBaseContent] = useState(() =>
    serializeEmailContent(initialContent ?? EMPTY_EMAIL_CONTENT),
  );
  const [loadedArtifactVersion, setLoadedArtifactVersion] = useState(
    artifact.currentVersionNumber,
  );
  const [recipientInputs, setRecipientInputs] = useState(() =>
    createRecipientInputs(initialContent ?? EMPTY_EMAIL_CONTENT),
  );

  if (loadedArtifactVersion !== artifact.currentVersionNumber) {
    const nextContent = parseEmailContent(currentVersion?.content ?? '');
    const nextDraft = nextContent ?? EMPTY_EMAIL_CONTENT;
    setDraft(nextDraft);
    setBaseContent(serializeEmailContent(nextDraft));
    setRecipientInputs(createRecipientInputs(nextDraft));
    setDisplayedVersionNumber(artifact.currentVersionNumber);
    setLoadedArtifactVersion(artifact.currentVersionNumber);
  }

  const displayedVersion = findVersion(artifact, displayedVersionNumber);
  const isViewingHistory =
    displayedVersionNumber !== artifact.currentVersionNumber;
  const isDirty =
    !isViewingHistory && serializeEmailContent(draft) !== baseContent;
  const isValid = isValidEmailContent(draft);

  const updateField = useCallback(
    <T extends keyof EditableEmailContent>(
      field: T,
      value: EditableEmailContent[T],
    ) => {
      setDraft((current) => ({ ...current, [field]: value }));
    },
    [setDraft],
  );

  const loadVersion = useCallback(
    (versionNumber: number) => {
      const version = findVersion(artifact, versionNumber);
      const content = parseEmailContent(version?.content ?? '');
      if (!content) return;
      setDraft(content);
      setRecipientInputs(createRecipientInputs(content));
      setDisplayedVersionNumber(versionNumber);
    },
    [artifact, setDisplayedVersionNumber, setDraft, setRecipientInputs],
  );

  const handleSave = useCallback(async () => {
    if (!isValid || isViewingHistory || !isDirty) return;
    const content = serializeEmailContent(draft);
    await onSave(content);
    setBaseContent(content);
    setRecipientInputs(createRecipientInputs(draft));
  }, [
    draft,
    isDirty,
    isValid,
    isViewingHistory,
    onSave,
    setBaseContent,
    setRecipientInputs,
  ]);

  const updateRecipients = useCallback(
    (field: RecipientField, value: string) => {
      setRecipientInputs((current) => ({ ...current, [field]: value }));
      updateField(field, parseRecipients(value));
    },
    [setRecipientInputs, updateField],
  );

  const handleClose = useCallback(() => {
    if (!isDirty) {
      onClose();
      return;
    }
    confirm({
      title: t('email.unsavedChanges.title'),
      description: t('email.unsavedChanges.description'),
      confirmText: t('email.unsavedChanges.discardAndClose'),
      cancelText: t('email.unsavedChanges.keepEditing'),
      onConfirm: onClose,
    });
  }, [confirm, isDirty, onClose, t]);

  const currentVersionContent = useMemo(
    () => parseEmailContent(displayedVersion?.content ?? ''),
    [displayedVersion],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
          <Mail className="size-4 shrink-0" />
          <span className="truncate" title={draft.subject || artifact.title}>
            {draft.subject || artifact.title}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={!isValid || isViewingHistory || isDirty || isSending}
            onClick={() => {
              confirm({
                title: t('email.send.title'),
                description: t('email.send.description'),
                confirmText: t('email.send.confirm'),
                cancelText: t('email.send.cancel'),
                onConfirm: () => void onSend(),
              });
            }}
          >
            <Send className="mr-1 size-3.5" />
            {t(isSending ? 'email.send.sending' : 'email.send.button')}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8"
            disabled={!isValid || isViewingHistory || !isDirty}
            onClick={() => void handleSave()}
          >
            <Save className="mr-1 size-3.5" />
            {t('editor.save')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {isViewingHistory && (
        <div className="flex min-h-[41px] items-center border-b bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          {t('email.viewingHistory', { version: displayedVersionNumber })}
        </div>
      )}

      {!currentVersionContent && (
        <div className="flex items-center gap-2 border-b bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {t('email.invalidContent')}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <EmailRecipientField
          label={t('email.to')}
          value={recipientInputs.to}
          disabled={isViewingHistory}
          onChange={(value) => updateRecipients('to', value)}
        />
        <EmailRecipientField
          label={t('email.cc')}
          value={recipientInputs.cc}
          disabled={isViewingHistory}
          onChange={(value) => updateRecipients('cc', value)}
        />
        <EmailRecipientField
          label={t('email.bcc')}
          value={recipientInputs.bcc}
          disabled={isViewingHistory}
          onChange={(value) => updateRecipients('bcc', value)}
        />
        <label className="block space-y-1.5 text-sm font-medium">
          {t('email.subject')}
          <Input
            value={draft.subject}
            disabled={isViewingHistory}
            onChange={(event) => updateField('subject', event.target.value)}
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          {t('email.body')}
          <Textarea
            className="min-h-64 resize-y font-sans"
            value={draft.body}
            disabled={isViewingHistory}
            onChange={(event) => updateField('body', event.target.value)}
          />
        </label>
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={artifact.currentVersionNumber}
          selectedVersionNumber={displayedVersionNumber}
          onSelect={loadVersion}
          onRevert={onRevert}
          disabled={isDirty}
        />
      )}
    </div>
  );
}

function EmailRecipientField({
  label,
  value,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      {label}
      <Input
        type="text"
        value={value}
        disabled={disabled}
        placeholder="name@example.com"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

type RecipientField = 'to' | 'cc' | 'bcc';

function createRecipientInputs(
  content: Pick<EditableEmailContent, RecipientField>,
) {
  return {
    to: formatRecipients(content.to),
    cc: formatRecipients(content.cc),
    bcc: formatRecipients(content.bcc),
  };
}

function findVersion(artifact: ArtifactResponseDto, versionNumber: number) {
  return artifact.versions?.find(
    (version) => version.versionNumber === versionNumber,
  );
}
