import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import {
  skillsControllerCreate,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

const createSkillSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  instructions: z.string().min(1, 'Instructions are required'),
});

export type CreateSkillData = z.infer<typeof createSkillSchema>;

export function useCreateSkill() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<CreateSkillData>({
    resolver: zodResolver(createSkillSchema),
    defaultValues: {
      name: '',
      shortDescription: '',
      instructions: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateSkillData) => {
      return await skillsControllerCreate(data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      if (data && data.id) {
        void router.navigate({
          to: '/skills/$id',
          params: { id: data.id },
        });
      }
    },
    onError: (error) => {
      console.error('Create skill failed:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          default:
            showError(t('create.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('create.error'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void router.invalidate();
    },
  });

  const onSubmit = (data: CreateSkillData) => {
    mutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
  };
}
