import useImageFairUseLimit from '@/pages/super-admin-settings/platform-config/api/useImageFairUseLimit';
import useSetImageFairUseLimit from '@/pages/super-admin-settings/platform-config/api/useSetImageFairUseLimit';
import SingleFairUseLimitCard from './SingleFairUseLimitCard';

export default function ImageGenerationFairUseSection() {
  const { images, isLoading, isError } = useImageFairUseLimit();

  return (
    <SingleFairUseLimitCard
      translationPrefix="imageFairUseLimit"
      idPrefix="image-fair-use"
      current={images}
      isLoading={isLoading}
      isError={isError}
      useSetLimit={useSetImageFairUseLimit}
    />
  );
}
