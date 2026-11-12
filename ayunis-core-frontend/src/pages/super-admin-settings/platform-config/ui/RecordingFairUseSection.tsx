import useRecordingFairUseLimit from '@/pages/super-admin-settings/platform-config/api/useRecordingFairUseLimit';
import useSetRecordingFairUseLimit from '@/pages/super-admin-settings/platform-config/api/useSetRecordingFairUseLimit';
import SingleFairUseLimitCard from './SingleFairUseLimitCard';

export default function RecordingFairUseSection() {
  const { recordings, isLoading, isError } = useRecordingFairUseLimit();

  return (
    <SingleFairUseLimitCard
      translationPrefix="recordingFairUseLimit"
      idPrefix="recording-fair-use"
      current={recordings}
      isLoading={isLoading}
      isError={isError}
      useSetLimit={useSetRecordingFairUseLimit}
    />
  );
}
