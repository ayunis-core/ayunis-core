import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { Form } from '@ayunis/ui/components/form';
import { NameField } from '@/widgets/entity-form-fields';
import { formatDate } from '@/shared/lib/format-date';
import { showSuccess } from '@/shared/lib/toast';

export interface RecordingPropertiesData {
  name: string;
}

export function RecordingPropertiesCard({
  recording,
  ownerLabel,
  onRename,
  disabled = false,
}: Readonly<{
  recording: {
    name: string;
    creatorName: string | null;
    createdAt: string;
  };
  ownerLabel: string;
  onRename: (data: RecordingPropertiesData) => Promise<unknown>;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('recordings');
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<RecordingPropertiesData>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t('detail.validation.nameRequired'))
          .max(255),
      }),
    ),
    defaultValues: { name: recording.name },
  });

  const submit = async (data: RecordingPropertiesData) => {
    setIsSaving(true);
    try {
      await onRename(data);
      form.reset(data);
      showSuccess(t('detail.rename.success'));
    } catch {
      // The rename hook reports the failure.
    } finally {
      setIsSaving(false);
    }
  };

  const details = [
    { key: 'owner', label: t('detail.properties.owner'), value: ownerLabel },
    {
      key: 'creator',
      label: t('detail.properties.creator'),
      value: recording.creatorName ?? t('detail.properties.deletedCreator'),
    },
    {
      key: 'created',
      label: t('detail.properties.created'),
      value: formatDate(recording.createdAt),
    },
  ];

  return (
    <Card data-testid="recording-properties-card">
      <CardHeader>
        <CardTitle>{t('detail.properties.title')}</CardTitle>
        <CardDescription>{t('detail.properties.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {details.map((detail) => (
            <div key={detail.key} className="contents">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd data-testid={`recording-detail-${detail.key}`}>
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="space-y-4"
          >
            <NameField
              control={form.control}
              name="name"
              translationNamespace="recordings"
              translationPrefix="detail.properties"
              disabled={disabled}
            />
            {!disabled ? (
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="recording-rename-submit"
              >
                {isSaving
                  ? t('detail.properties.buttons.saving')
                  : t('detail.properties.buttons.save')}
              </Button>
            ) : null}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
