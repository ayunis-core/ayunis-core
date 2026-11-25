import { useState, type ReactNode } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useImproveRoutinePrompt } from '@/features/routines/api/useImproveRoutinePrompt';
import type { RoutineFormFields } from '@/features/routines/model/types';
import { ImproveTextButton } from '@/shared/ui/improve-text-button';

export interface RoutinePromptAssist {
  /** While a rewrite runs, the task is read-only and the form cannot be saved. */
  isBusy: boolean;
  labelAction: ReactNode;
  /** Ends an offered suggestion, so a saved rewrite cannot be reverted. */
  endSuggestion: () => void;
}

export function useRoutinePromptAssist(
  form: UseFormReturn<RoutineFormFields>,
): RoutinePromptAssist {
  const improve = useImproveRoutinePrompt();
  const [session, setSession] = useState(0);
  const [name, prompt] = useWatch({
    control: form.control,
    name: ['name', 'prompt'],
  });

  return {
    isBusy: improve.isPending,
    labelAction: (
      <ImproveTextButton
        key={session}
        text={prompt}
        isPending={improve.isPending}
        improve={(sourceText, onSuccess) =>
          improve.mutate(
            { name: name.trim() || undefined, prompt: sourceText },
            { onSuccess },
          )
        }
        onImproved={(text) =>
          form.setValue('prompt', text, { shouldDirty: true })
        }
        testId="improve-routine-prompt"
      />
    ),
    endSuggestion: () => setSession((current) => current + 1),
  };
}
