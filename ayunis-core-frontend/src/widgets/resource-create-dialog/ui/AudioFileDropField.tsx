import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FileAudio, Upload } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import { ACCEPTED_AUDIO_PICKER_TYPES } from '@/shared/lib/audio-files';

export function AudioFileDropField({
  file,
  name,
  onBlur,
  onSelect,
}: Readonly<{
  file: File | undefined;
  name: string;
  onBlur: () => void;
  onSelect: (file: File | undefined) => void;
}>) {
  const { t } = useTranslation('recordings');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0] as File | undefined;
    if (dropped) onSelect(dropped);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      {file ? (
        <FileAudio className="size-5 shrink-0 text-muted-foreground" />
      ) : (
        <Upload className="size-5 shrink-0 text-muted-foreground" />
      )}
      <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {file ? (
          <span className="font-medium text-foreground">{file.name}</span>
        ) : (
          t('createDialog.form.drop.hint')
        )}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        {file
          ? t('createDialog.form.drop.replace')
          : t('createDialog.form.drop.select')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_AUDIO_PICKER_TYPES}
        className="hidden"
        data-testid="recording-create-audio"
        name={name}
        onBlur={onBlur}
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
