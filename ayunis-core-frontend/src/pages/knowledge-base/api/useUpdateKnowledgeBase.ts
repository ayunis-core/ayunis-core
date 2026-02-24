import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerUpdate,
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';

interface UpdateKnowledgeBaseData {
  name: string;
  description: string;
}

interface UseUpdateKnowledgeBaseProps {
  knowledgeBase: KnowledgeBaseResponseDto;
}

export function useUpdateKnowledgeBase({
  knowledgeBase,
}: UseUpdateKnowledgeBaseProps) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();

  const schema = z.object({
    name: z.string().min(1, t('detail.validation.nameRequired')).max(255),
    description: z.string().max(2000),
  });

  const form = useForm<UpdateKnowledgeBaseData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: knowledgeBase.name,
      description: knowledgeBase.description,
    },
  });

  const mutation = useKnowledgeBasesControllerUpdate({
    mutation: {
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getKnowledgeBasesControllerFindOneQueryKey(
            knowledgeBase.id,
          ),
        });
        void router.invalidate();
        form.reset(variables.data);
        showSuccess(t('detail.update.success'));
      },
      onError: () => {
        showError(t('detail.update.error'));
      },
    },
  });

  const onSubmit = (data: UpdateKnowledgeBaseData) => {
    mutation.mutate({ id: knowledgeBase.id, data });
  };

  return { form, onSubmit, isLoading: mutation.isPending };
}
