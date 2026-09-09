import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Textarea } from '@ayunis/ui/components/textarea';
import { InstructionsField, NameField } from '@/widgets/entity-form-fields';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { showError, showSuccess } from '@/shared/lib/toast';

export interface SkillPropertiesData {
  name: string;
  shortDescription: string;
  instructions: string;
}

export function SkillPropertiesCard({
  skill,
  onUpdate,
  disabled = false,
}: Readonly<{
  skill: SkillPropertiesData;
  onUpdate: (data: SkillPropertiesData) => Promise<unknown>;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('skill');
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<SkillPropertiesData>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .min(1, t('properties.validation.nameRequired'))
          .max(100),
        shortDescription: z
          .string()
          .min(1, t('properties.validation.shortDescriptionRequired')),
        instructions: z
          .string()
          .min(1, t('properties.validation.instructionsRequired')),
      }),
    ),
    defaultValues: skill,
  });

  const submit = async (data: SkillPropertiesData) => {
    setIsSaving(true);
    try {
      await onUpdate(data);
      form.reset(data);
      showSuccess(t('update.success'));
    } catch {
      showError(t('update.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-testid="skill-properties-card">
      <CardHeader>
        <CardTitle>{t('properties.title')}</CardTitle>
        <CardDescription>{t('properties.description')}</CardDescription>
        <CardAction>
          <HelpLink path="skills/name-and-description/" variant="icon" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="space-y-4"
          >
            <NameField
              control={form.control}
              name="name"
              translationNamespace="skill"
              translationPrefix="properties"
              disabled={disabled}
            />
            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('properties.form.shortDescriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'properties.form.shortDescriptionPlaceholder',
                      )}
                      className="min-h-[80px] max-h-[200px]"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('properties.form.shortDescriptionHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <InstructionsField
              control={form.control}
              name="instructions"
              translationNamespace="skill"
              translationPrefix="properties"
              disabled={disabled}
              className="min-h-[250px] max-h-[500px]"
            />
            <Button type="submit" disabled={isSaving || disabled}>
              {isSaving
                ? t('properties.buttons.saving')
                : t('properties.buttons.save')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export interface KnowledgeBasePropertiesData {
  name: string;
  description: string;
}

export function KnowledgeBasePropertiesCard({
  knowledgeBase,
  onUpdate,
  disabled = false,
}: Readonly<{
  knowledgeBase: KnowledgeBasePropertiesData;
  onUpdate: (data: KnowledgeBasePropertiesData) => Promise<unknown>;
  disabled?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<KnowledgeBasePropertiesData>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, t('detail.validation.nameRequired')).max(255),
        description: z.string().max(2000),
      }),
    ),
    defaultValues: knowledgeBase,
  });

  const submit = async (data: KnowledgeBasePropertiesData) => {
    setIsSaving(true);
    try {
      await onUpdate(data);
      form.reset(data);
      showSuccess(t('detail.update.success'));
    } catch {
      showError(t('detail.update.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card data-testid="knowledge-base-properties-card">
      <CardHeader>
        <CardTitle>{t('detail.properties.title')}</CardTitle>
        <CardDescription>{t('detail.properties.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(submit)(event)}
            className="space-y-4"
          >
            <NameField
              control={form.control}
              name="name"
              translationNamespace="knowledge-bases"
              translationPrefix="detail.properties"
              disabled={disabled}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('detail.properties.form.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'detail.properties.form.descriptionPlaceholder',
                      )}
                      className="min-h-[80px] max-h-[200px]"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('detail.properties.form.descriptionHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!disabled ? (
              <Button type="submit" disabled={isSaving}>
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
