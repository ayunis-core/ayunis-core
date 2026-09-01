import { useContext } from 'react';
import {
  JourneyContext,
  type JourneyContextValue,
} from '@/widgets/prototype-journey/model/journey-context';

export function useJourneyControls(): JourneyContextValue {
  const value = useContext(JourneyContext);
  if (!value) {
    throw new Error('useJourneyControls must be used inside JourneyProvider');
  }
  return value;
}
