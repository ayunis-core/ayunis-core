import { useSkillTextAssist } from '@/widgets/skill-improve-button';
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
import type {
  OwnerOption,
  OwnerSelection,
} from '@/features/resource-ownership';
import { OwnerChoice, PERSONAL_OWNER_KEY } from './OwnerChoice';

export interface CreateSkillFormData {
  name: string;
  shortDescription: string;
  instructions: string;
}

/** What `onCreate` receives: the form fields plus the chosen owner, if any. */
export type CreateSkillSubmission = CreateSkillFormData & {
  owner?: OwnerSelection;
};

function selectedOwner(
  options: OwnerOption[] | undefined,
  key: string,
): OwnerSelection | undefined {
  return options?.find((option) => option.key === key)?.selection;
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
  ownerOptions,
  isOwnerChoiceLoading = false,
}: Readonly<{
  onCreate: (data: CreateSkillSubmission) => Promise<unknown>;
  /** Offered as an owner choice when there is more than one. */
  ownerOptions?: OwnerOption[];
  /** Blocks creating until the owner choice is known. */
  isOwnerChoiceLoading?: boolean;
  buttonText?: string;
  buttonTestId?: string;
  buttonClassName?: string;
  showIcon?: boolean;
  footerHint?: string;
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
  const [ownerKey, setOwnerKey] = useState(PERSONAL_OWNER_KEY);
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

  const assist = useSkillTextAssist(form, {
    labels: {
      trigger: t('createDialog.form.shortDescriptionLabel'),
      instructions: t('createDialog.form.instructionsLabel'),
    },
  });

  const close = () => {
    assist.reset();
    setOwnerKey(PERSONAL_OWNER_KEY);
    setIsOpen(false);
  };
  const submit = async (data: CreateSkillFormData) => {
    setIsLoading(true);
    try {
      await onCreate({ ...data, owner: selectedOwner(ownerOptions, ownerKey) });
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
      onOpenChange={(next) => {
        if (!next) {
          assist.discardPending();
          setOwnerKey(PERSONAL_OWNER_KEY);
        }
        setIsOpen(next);
      }}
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
      isSubmitDisabled={assist.isBusy || isOwnerChoiceLoading}
    >
      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <OwnerChoice
              options={ownerOptions}
              value={ownerKey}
              onValueChange={setOwnerKey}
              testId="skill-create-owner"
            />
            <NameField
              control={form.control}
              name="name"
              translationNamespace="skills"
            />
            <ShortDescriptionField
              control={form.control}
              name="shortDescription"
              translationNamespace="skills"
              multiline
              {...assist.trigger}
            />
          </div>
          <InstructionsField
            control={form.control}
            name="instructions"
            translationNamespace="skills"
            {...assist.instructions}
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

export type CreateKnowledgeBaseSubmission = CreateKnowledgeBaseFormData & {
  owner?: OwnerSelection;
};

export function KnowledgeBaseCreateDialog({
  onCreate,
  buttonText,
  buttonTestId,
  buttonClassName,
  showIcon = false,
  ownerOptions,
  isOwnerChoiceLoading = false,
}: Readonly<{
  onCreate: (data: CreateKnowledgeBaseSubmission) => Promise<unknown>;
  /** Offered as an owner choice when there is more than one. */
  ownerOptions?: OwnerOption[];
  /** Blocks creating until the owner choice is known. */
  isOwnerChoiceLoading?: boolean;
  buttonText?: string;
  buttonTestId?: string;
  buttonClassName?: string;
  showIcon?: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  const translations = useCreateDialogTranslations('knowledge-bases');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ownerKey, setOwnerKey] = useState(PERSONAL_OWNER_KEY);
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
    setOwnerKey(PERSONAL_OWNER_KEY);
    form.reset();
  };
  const submit = async (data: CreateKnowledgeBaseFormData) => {
    setIsLoading(true);
    try {
      await onCreate({ ...data, owner: selectedOwner(ownerOptions, ownerKey) });
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
      onOpenChange={(next) => {
        if (!next) setOwnerKey(PERSONAL_OWNER_KEY);
        setIsOpen(next);
      }}
      onCancel={close}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
      buttonTestId={buttonTestId}
      isSubmitDisabled={isOwnerChoiceLoading}
    >
      <Form {...form}>
        <div className="space-y-6">
          <OwnerChoice
            options={ownerOptions}
            value={ownerKey}
            onValueChange={setOwnerKey}
            testId="knowledge-base-create-owner"
          />
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
