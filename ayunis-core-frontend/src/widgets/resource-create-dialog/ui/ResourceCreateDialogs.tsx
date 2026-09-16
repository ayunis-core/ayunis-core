import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Form } from '@ayunis/ui/components/form';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import {
  InstructionsField,
  NameField,
  ShortDescriptionField,
} from '@/widgets/entity-form-fields';

export interface CreateSkillFormData {
  name: string;
  shortDescription: string;
  instructions: string;
}

export function SkillCreateDialog({
  onCreate,
  buttonText,
  buttonTestId,
  buttonClassName,
  showIcon = false,
  footerHint,
  open,
  onOpenChange,
}: Readonly<{
  onCreate: (data: CreateSkillFormData) => Promise<unknown>;
  buttonText?: string;
  buttonTestId?: string;
  buttonClassName?: string;
  showIcon?: boolean;
  footerHint?: string;
  /** Pass both to open the dialog from elsewhere; the trigger is dropped then. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const { t } = useTranslation('skills');
  const translations = useCreateDialogTranslations('skills');
  const isControlled = open !== undefined;
  const [isOwnOpen, setIsOwnOpen] = useState(false);
  const isOpen = isControlled ? open : isOwnOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setIsOwnOpen(next);
  };
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<CreateSkillFormData>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .min(1, t('createDialog.validation.nameRequired'))
          .max(100),
        shortDescription: z
          .string()
          .min(1, t('createDialog.validation.shortDescriptionRequired')),
        instructions: z
          .string()
          .min(1, t('createDialog.validation.instructionsRequired')),
      }),
    ),
    defaultValues: { name: '', shortDescription: '', instructions: '' },
  });

  const close = () => {
    form.reset();
    setIsOpen(false);
  };
  const submit = async (data: CreateSkillFormData) => {
    setIsLoading(true);
    try {
      await onCreate(data);
      close();
    } catch {
      // Scope-specific mutation handlers surface the error.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CreateEntityDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onCancel={close}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      buttonTestId={buttonTestId}
      footerHint={footerHint}
      hideTrigger={isControlled}
    >
      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <NameField
              control={form.control}
              name="name"
              translationNamespace="skills"
            />
            <ShortDescriptionField
              control={form.control}
              name="shortDescription"
              translationNamespace="skills"
            />
          </div>
          <InstructionsField
            control={form.control}
            name="instructions"
            translationNamespace="skills"
          />
        </div>
      </Form>
    </CreateEntityDialog>
  );
}

export interface CreateKnowledgeBaseFormData {
  name: string;
  description?: string;
}

export function KnowledgeBaseCreateDialog({
  onCreate,
  buttonText,
  buttonTestId,
  buttonClassName,
  showIcon = false,
}: Readonly<{
  onCreate: (data: CreateKnowledgeBaseFormData) => Promise<unknown>;
  buttonText?: string;
  buttonTestId?: string;
  buttonClassName?: string;
  showIcon?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const translations = useCreateDialogTranslations('knowledge-bases');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<CreateKnowledgeBaseFormData>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .min(1, t('createDialog.validation.nameRequired'))
          .max(255),
        description: z.string().max(2000).optional(),
      }),
    ),
    defaultValues: { name: '', description: '' },
  });

  const close = () => {
    setIsOpen(false);
    form.reset();
  };
  const submit = async (data: CreateKnowledgeBaseFormData) => {
    setIsLoading(true);
    try {
      await onCreate(data);
      form.clearErrors();
      close();
    } catch {
      // Scope-specific mutation handlers surface the error.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CreateEntityDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onCancel={close}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      buttonTestId={buttonTestId}
    >
      <Form {...form}>
        <div className="space-y-6">
          <NameField
            control={form.control}
            name="name"
            translationNamespace="knowledge-bases"
          />
          <ShortDescriptionField
            control={form.control}
            name="description"
            translationNamespace="knowledge-bases"
            multiline
          />
        </div>
      </Form>
    </CreateEntityDialog>
  );
}
