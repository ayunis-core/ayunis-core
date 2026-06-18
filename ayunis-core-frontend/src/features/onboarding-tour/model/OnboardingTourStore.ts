export interface TourRequest {
  /** `data-tour` name set by <OnboardingTourTarget>; resolved to a `[data-tour="…"]` selector. */
  target: string;
  title?: string;
  description?: string;
  dismissLabel: string;
}
type TourListener = (request: TourRequest | null) => void;

class TourStore {
  private current: TourRequest | null = null;
  private readonly listeners = new Set<TourListener>();

  private emit(): void {
    for (const listener of this.listeners) listener(this.current);
  }

  subscribe(cb: TourListener): () => void {
    const { listeners } = this;
    listeners.add(cb);
    cb(this.current);

    return function unsubscribe() {
      listeners.delete(cb);
    };
  }

  subscribeActive(cb: (active: boolean) => void): () => void {
    return this.subscribe(function onTour(request) {
      cb(request !== null);
    });
  }

  launch(request: TourRequest): void {
    this.current = request;
    this.emit();
  }

  destroy(): void {
    if (this.current === null) {
      return;
    }

    this.current = null;
    this.emit();
  }
}

const store = new TourStore();

export const subscribeTour = store.subscribe.bind(store);
export const subscribeTourActive = store.subscribeActive.bind(store);
export const launchTour = store.launch.bind(store);
export const destroyTour = store.destroy.bind(store);
