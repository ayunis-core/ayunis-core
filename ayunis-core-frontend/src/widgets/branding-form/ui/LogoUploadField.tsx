import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, AlertCircle, ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { cn } from '@/shared/lib/shadcn/utils';

const MAX_FILE_SIZE = 512 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

async function loadImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

interface LogoUploadFieldProps {
  currentUrl: string | null | undefined;
  pendingFile: File | null;
  pendingPreview: string | null;
  removed: boolean;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}

export function LogoUploadField({
  currentUrl,
  pendingFile,
  pendingPreview,
  removed,
  disabled,
  onChange,
  onRemove,
}: Readonly<LogoUploadFieldProps>) {
  const { t } = useTranslation('admin-settings-organization');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayUrl = pendingPreview ?? (removed ? null : (currentUrl ?? null));
  const hasLogo = !!displayUrl;
  const filename = pendingFile?.name;

  function reject(messageKey: string) {
    setError(t(messageKey));
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function validateAndSet(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject('organization.errorFileType');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      reject('organization.errorFileSize');
      return;
    }
    const dims = await loadImageDimensions(file);
    if (!dims || dims.width !== dims.height) {
      reject('organization.errorNotSquare');
      return;
    }
    setError(null);
    onChange(file);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await validateAndSet(file);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files.item(0);
    if (file) await validateAndSet(file);
  }

  function handleRemove() {
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onRemove();
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          // Browser fires dragleave when the pointer moves over a child
          // element. Skip those so the highlight doesn't flicker.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setIsDragging(false);
        }}
        onDrop={(e) => {
          void handleDrop(e);
        }}
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-3 rounded-md border border-dashed p-3 text-left transition-colors',
          'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-60',
          isDragging && 'border-primary bg-accent/50',
          hasLogo && 'border-solid',
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {hasLogo ? (
            <img
              src={displayUrl}
              alt={t('organization.faviconCurrent')}
              className="size-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <ImageIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">
            {hasLogo
              ? (filename ?? t('organization.faviconCurrent'))
              : t('organization.faviconDropzoneTitle')}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t('organization.faviconHint')}
          </p>
        </div>
        {hasLogo ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={t('organization.faviconRemove')}
            aria-disabled={disabled || undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) handleRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) handleRemove();
              }
            }}
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <Trash2 className="size-4" />
          </span>
        ) : (
          <Upload
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => {
          void handleFileChange(e);
        }}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
