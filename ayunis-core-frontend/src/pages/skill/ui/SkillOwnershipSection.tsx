import {
  HandoverRequestArea,
  type HandoverState,
} from '@/features/resource-handover';
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  ResourceOwnershipCard,
  showsOwnershipCard,
} from '@/widgets/resource-ownership-card';

export function SkillOwnershipSection({
  skill,
  handover,
  onDecided,
}: Readonly<{
  skill: SkillResponseDto;
  handover: HandoverState;
  onDecided: () => Promise<void>;
}>) {
  const reviewedFor = handover.isReviewing
    ? handover.pending?.requestedBy.name
    : undefined;
  return (
    <>
      {(handover.isReviewing
        ? reviewedFor !== undefined
        : showsOwnershipCard(skill)) && (
        <ResourceOwnershipCard
          kind="skill"
          resource={skill}
          reviewedFor={reviewedFor}
        />
      )}
      <HandoverRequestArea
        kind="skill"
        pending={handover.pending}
        onDecided={onDecided}
      />
    </>
  );
}
