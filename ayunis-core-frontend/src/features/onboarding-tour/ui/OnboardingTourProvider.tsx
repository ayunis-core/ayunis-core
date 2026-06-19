import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  OnboardingTourContext,
  type TourRequest,
} from '../model/onboardingTourContext';

const TourRenderer = lazy(() => import('./TourRenderer'));

export function OnboardingTourProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [request, setRequest] = useState<TourRequest | null>(null);

  const launchTour = useCallback((next: TourRequest) => setRequest(next), []);
  const endTour = useCallback(() => setRequest(null), []);

  const isTourActive = request !== null;
  const value = useMemo(
    () => ({ launchTour, isTourActive }),
    [launchTour, isTourActive],
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      {request && (
        <Suspense fallback={null}>
          <TourRenderer
            key={request.target}
            request={request}
            onEnd={endTour}
          />
        </Suspense>
      )}
    </OnboardingTourContext.Provider>
  );
}
