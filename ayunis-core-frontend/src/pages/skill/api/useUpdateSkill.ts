import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useSkillsControllerUpdate,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';

const updateSkillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  shortDescription: z.string().min(1, 'Short description is required'),
  instructions: z.string().min(1, 'Instructions are required'),
});

type UpdateSkillData = z.infer<typeof updateSkillSchema>;

interface UseUpdateSkillProps {
  skill: SkillResponseDto;
}

export function useUpdateSkill({ skill }: UseUpdateSkillProps) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<UpdateSkillData>({
    resolver: zodResolver(updateSkillSchema),
    defaultValues: {
      name: skill.name,
      shortDescription: skill.shortDescription,
      instructions: skill.instructions,
    },
  });

  const mutation = useSkillsControllerUpdate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindAllQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindOneQueryKey(skill.id),
        });
        void router.invalidate();
        showSuccess(t('update.success'));
      },
      onError: () => {
        showError(t('update.error'));
      },
    },
  });

  const onSubmit = (data: UpdateSkillData) => {
    mutation.mutate({ id: skill.id, data });
  };

  return {
    form,
    onSubmit,
    isLoading: mutation.isPending,
  };
}
