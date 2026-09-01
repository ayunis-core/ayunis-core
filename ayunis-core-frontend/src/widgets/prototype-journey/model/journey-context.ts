import { createContext } from 'react';
import type {
  AvailabilityVariant,
  EntryVariant,
} from '@/widgets/prototype-journey/model/journey';

export interface JourneyContextValue {
  stepIndex: number;
  variant: EntryVariant;
  availabilityVariant: AvailabilityVariant;
  setStepIndex: (stepIndex: number) => void;
  setVariant: (variant: EntryVariant) => void;
  setAvailabilityVariant: (variant: AvailabilityVariant) => void;
}

export const JourneyContext = createContext<JourneyContextValue | null>(null);
