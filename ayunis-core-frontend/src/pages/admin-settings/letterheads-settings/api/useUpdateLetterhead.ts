import { useQueryClient, useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { getLetterheadsControllerFindAllQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import { customAxiosInstance } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { PageMargins } from '../model/types';

interface UpdateLetterheadParams {
  id: string;
  name?: string;
  description?: string;
  firstPagePdf?: File;
  continuationPagePdf?: File;
  firstPageMargins?: PageMargins;
  continuationPageMargins?: PageMargins;
  removeContinuationPage?: boolean;
}

export function useUpdateLetterhead(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-letterheads');

  const mutation = useMutation({
    mutationFn: (params: UpdateLetterheadParams) => {
      const formData = new FormData();
      if (params.name !== undefined) {
        formData.append('name', params.name);
      }
      if (params.description !== undefined) {
        formData.append('description', params.description);
      }
      if (params.firstPagePdf) {
        formData.append('firstPagePdf', params.firstPagePdf);
      }
      if (params.continuationPagePdf) {
        formData.append('continuationPagePdf', params.continuationPagePdf);
      }
      if (params.firstPageMargins) {
        formData.append(
          'firstPageMargins',
          JSON.stringify(params.firstPageMargins),
        );
      }
      if (params.continuationPageMargins) {
        formData.append(
          'continuationPageMargins',
          JSON.stringify(params.continuationPageMargins),
        );
      }
      if (params.removeContinuationPage) {
        formData.append('removeContinuationPage', 'true');
      }

      return customAxiosInstance<LetterheadResponseDto>({
        url: `/letterheads/${params.id}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'multipart/form-data' },
        data: formData,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getLetterheadsControllerFindAllQueryKey(),
      });
      showSuccess(t('letterheads.editDialog.success'));
      onSuccess?.();
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'LETTERHEAD_INVALID_PDF':
            showError(t('letterheads.editDialog.invalidPdf'));
            break;
          case 'LETTERHEAD_INVALID_PAGE_MARGINS':
            showError(t('letterheads.editDialog.invalidPageMargins'));
            break;
          default:
            showError(t('letterheads.editDialog.error'));
        }
      } catch {
        showError(t('letterheads.editDialog.error'));
      }
    },
  });

  return {
    updateLetterhead: (params: UpdateLetterheadParams) =>
      mutation.mutate(params),
    isUpdating: mutation.isPending,
  };
}
