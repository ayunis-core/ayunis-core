import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUp, Mic, Plus, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ChatComposer } from '@ayunis/chat/composer';
import '@ayunis/chat/composer.css';
import { ModelModeIcon } from '@/widgets/model-select-options';
import { withViewTransition } from '@/pages/welcome-prototype/model/view-transition';
import { CitySkyline } from './CitySkyline';
import './chat-flow.css';

const CITY_HOLD_MS = 4600;
const TITLE_TRANSITION: CSSProperties = {
  viewTransitionName: 'wp-finale-title',
};

function ProductStart() {
  const [draft, setDraft] = useState('');

  return (
    <section className="wp-flow wp-finale">
      <h2 className="wp-finale__title" style={TITLE_TRANSITION}>
        Wie kann ich Ihnen helfen?
      </h2>
      <div className="wp-finale__composer">
        <ChatComposer
          state="idle"
          dragging={false}
          animateHeight
          images={[]}
          onRemoveImage={() => undefined}
          textarea={{
            value: draft,
            onChange: (event) => setDraft(event.target.value),
            placeholder: 'Nachricht an Ayunis Core',
            'aria-label': 'Nachricht an Ayunis Core',
          }}
          actions={
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" aria-label="Hinzufügen">
                <Plus />
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <ModelModeIcon mode="auto" />
                  Auto
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Diktieren"
                >
                  <Mic />
                </Button>
                <Button
                  size="icon"
                  className="chat-input-send-button rounded-full"
                  disabled={!draft.trim()}
                  aria-label="Senden"
                >
                  <ArrowUp />
                </Button>
              </div>
            </div>
          }
        />
      </div>
      <div className="wp-finale__skills">
        <Button variant="outline" size="sm">
          <Sparkles />
          Bauanträge vorprüfen
        </Button>
      </div>
    </section>
  );
}

export function FinaleScreen() {
  const [phase, setPhase] = useState<'city' | 'product'>('city');

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => withViewTransition(() => setPhase('product')),
      CITY_HOLD_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (phase === 'product') return <ProductStart />;

  return (
    <section className="wp-flow wp-city-scene">
      <CitySkyline />
      <h2
        className="wp-flow__title wp-city-scene__title"
        style={TITLE_TRANSITION}
      >
        Jetzt smart arbeiten.
      </h2>
    </section>
  );
}
