import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from '@tanstack/react-router';
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

  const { pathname } = useLocation();
  const [isReturnActive, setIsReturnActive] = useState(false);
  const keepOnNextNavRef = useRef(false);

  const armReturn = useCallback(() => {
    keepOnNextNavRef.current = true;
    setIsReturnActive(true);
  }, []);

  useEffect(() => {
    if (keepOnNextNavRef.current) {
      keepOnNextNavRef.current = false;
      return;
    }
    setIsReturnActive(false);
  }, [pathname]);

  const value = useMemo(
    () => ({ launchTour, isTourActive, isReturnActive, armReturn }),
    [launchTour, isTourActive, isReturnActive, armReturn],
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
