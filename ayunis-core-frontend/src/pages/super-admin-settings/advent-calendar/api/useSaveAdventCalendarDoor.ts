import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  superAdminAdventCalendarControllerRemoveDoorImage,
  superAdminAdventCalendarControllerSaveDoor,
  superAdminAdventCalendarControllerUploadDoorImage,
} from '@ayunis/api-client';
import type { SuperAdminAdventCalendarDoorResponseDto } from '@ayunis/api-client/schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import {
  doorImageAction,
  toDoorFormValues,
  toSaveDoorRequest,
  uploadsImageBeforeText,
} from '@/pages/super-admin-settings/advent-calendar/lib/door-form-values';
import { setDoorValidationErrors } from '@/pages/super-admin-settings/advent-calendar/lib/door-validation-errors';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';
import {
  invalidateAdventCalendarQueries,
  storeSavedDoor,
} from './adventCalendarQueryCache';

class DoorImageSaveError extends Error {
  constructor(
    readonly reason: unknown,
    readonly textSaved: boolean,
  ) {
    super('Saving the door image failed');
  }
}

async function changeImage(
  change: () => Promise<SuperAdminAdventCalendarDoorResponseDto>,
  textSaved: boolean,
) {
  try {
    return await change();
  } catch (error) {
    throw new DoorImageSaveError(error, textSaved);
  }
}

function uploadImage(day: number, file: File, textSaved: boolean) {
  return changeImage(
    () => superAdminAdventCalendarControllerUploadDoorImage(day, { file }),
    textSaved,
  );
}

async function saveDoor(
  day: number,
  values: DoorFormFields,
  hasSavedContent: boolean,
): Promise<SuperAdminAdventCalendarDoorResponseDto> {
  const saveText = () =>
    superAdminAdventCalendarControllerSaveDoor(day, toSaveDoorRequest(values));
  if (uploadsImageBeforeText(values, hasSavedContent) && values.imageFile) {
    await uploadImage(day, values.imageFile, false);
    return saveText();
  }
  const door = await saveText();
  const action = doorImageAction(values, door.content?.media?.type);
  if (action === 'upload' && values.imageFile) {
    return uploadImage(day, values.imageFile, true);
  }
  if (action === 'remove') {
    return changeImage(
      () => superAdminAdventCalendarControllerRemoveDoorImage(day),
      true,
    );
  }
  return door;
}

function showImageError(
  form: UseFormReturn<DoorFormFields>,
  t: TFunction,
  error: DoorImageSaveError,
) {
  const showUnknownError = () => {
    if (error.textSaved) {
      showError(t('toast.imageError'));
    } else {
      form.setError('imageFile', {
        message: t('validation.imageFile.notSaved'),
      });
    }
  };
  try {
    const { code, status } = extractErrorData(error.reason);
    if (code === 'ADVENT_CALENDAR_IMAGE_UNSUPPORTED') {
      form.setError('imageFile', {
        message: t('validation.imageFile.unsupported'),
      });
    } else if (status === 413) {
      form.setError('imageFile', {
        message: t('validation.imageFile.tooLarge'),
      });
    } else {
      showUnknownError();
    }
  } catch {
    showUnknownError();
  }
}

function showSaveError(
  form: UseFormReturn<DoorFormFields>,
  t: TFunction,
  error: unknown,
) {
  try {
    const { code, errors } = extractErrorData(error);
    if (code === 'VALIDATION_ERROR' && errors) {
      setDoorValidationErrors(form, errors, t);
    } else if (code === 'ADVENT_CALENDAR_VIDEO_INVALID') {
      form.setError('vimeoUrl', {
        message: t('validation.vimeoUrl.isVimeoUrl'),
      });
    } else {
      showError(t('toast.saveError'));
    }
  } catch {
    showError(t('toast.saveError'));
  }
}

export function useSaveAdventCalendarDoor(
  day: number,
  form: UseFormReturn<DoorFormFields>,
  hasSavedContent: boolean,
) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (values: DoorFormFields) =>
      saveDoor(day, values, hasSavedContent),
    onSuccess: (door) => {
      storeSavedDoor(queryClient, door);
      form.reset(toDoorFormValues(door.content));
      showSuccess(t('toast.saved', { day }));
    },
    onError: (error: unknown) => {
      // A saved door's new image is uploaded before its text, so a failed
      // text save can still have changed the door.
      invalidateAdventCalendarQueries(queryClient);
      if (error instanceof DoorImageSaveError) {
        showImageError(form, t, error);
      } else {
        showSaveError(form, t, error);
      }
    },
  });

  return {
    saveDoor: (values: DoorFormFields) => mutate(values),
    isSaving: isPending,
  };
}
