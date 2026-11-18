import { useState, type ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { Form } from '@ayunis/ui/components/form';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import type {
  OwnerOption,
  OwnerSelection,
} from '@/features/resource-ownership';
import { OwnerChoice, PERSONAL_OWNER_KEY } from './OwnerChoice';

export interface OwnedResourceCreateDialogProps<TData> {
  onCreate: (data: TData & { owner?: OwnerSelection }) => Promise<unknown>;
  /** Offered as an owner choice when there is more than one. */
  ownerOptions?: OwnerOption[];
  /** Blocks creating until the owner choice is known. */
  isOwnerChoiceLoading?: boolean;
  buttonText?: string;
  buttonTestId?: string;
  buttonClassName?: string;
  showIcon?: boolean;
}

/** An uncontrolled create dialog whose form is followed by the owner choice. */
export function OwnedResourceCreateDialog<TData extends FieldValues>({
  form,
  namespace,
  ownerTestId,
  groupedOwners = false,
  children,
  onCreate,
  ownerOptions,
  isOwnerChoiceLoading = false,
  buttonText,
  buttonTestId,
  buttonClassName,
  showIcon = false,
}: Readonly<
  OwnedResourceCreateDialogProps<TData> & {
    form: UseFormReturn<TData>;
    namespace: string;
    ownerTestId: string;
    groupedOwners?: boolean;
    children: ReactNode;
  }
>) {
  const translations = useCreateDialogTranslations(namespace);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ownerKey, setOwnerKey] = useState(PERSONAL_OWNER_KEY);

  const close = () => {
    setIsOpen(false);
    setOwnerKey(PERSONAL_OWNER_KEY);
    form.reset();
  };
  const submit = async (data: TData) => {
    setIsLoading(true);
    try {
      await onCreate({
        ...data,
        owner: ownerOptions?.find((option) => option.key === ownerKey)
          ?.selection,
      });
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
            grouped={groupedOwners}
            testId={ownerTestId}
          />
          {children}
        </div>
      </Form>
    </CreateEntityDialog>
  );
}
