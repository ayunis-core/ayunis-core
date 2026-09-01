import { useMemo, useState, type ReactNode } from 'react';
import { JourneyContext } from '@/widgets/prototype-journey/model/journey-context';
import type {
  AvailabilityVariant,
  EntryVariant,
} from '@/widgets/prototype-journey/model/journey';

export function JourneyProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [variant, setVariant] = useState<EntryVariant>('single');
  const [availabilityVariant, setAvailabilityVariant] =
    useState<AvailabilityVariant>('row');

  const value = useMemo(
    () => ({
      stepIndex,
      variant,
      availabilityVariant,
      setStepIndex,
      setVariant,
      setAvailabilityVariant,
    }),
    [stepIndex, variant, availabilityVariant],
  );

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}
