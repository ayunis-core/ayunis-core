import { Card } from '@ayunis/ui/components/card';
import { cn } from '@ayunis/ui/lib/cn';
import { useTheme } from '@/features/theme';
import { ScreenShell } from './ScreenShell';

const THEMES = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
] as const;

function AppPreview({ theme }: Readonly<{ theme: 'light' | 'dark' }>) {
  return (
    <span className="wp-appearance-preview" data-theme={theme} aria-hidden>
      <span className="wp-appearance-preview__sidebar">
        <span />
        <span />
        <span />
      </span>
      <span className="wp-appearance-preview__main">
        <span />
        <span />
        <span className="wp-appearance-preview__input" />
      </span>
    </span>
  );
}

export function AppearanceScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const { theme, setTheme } = useTheme();

  return (
    <ScreenShell
      title="Hell oder dunkel?"
      hint="Sie können das jederzeit in den Einstellungen ändern."
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex flex-wrap justify-center gap-4">
        {THEMES.map((option) => (
          <Card
            key={option.value}
            as="button"
            type="button"
            aria-pressed={theme === option.value}
            className={cn(
              'wp-appearance-tile',
              theme === option.value && 'is-selected',
            )}
            onClick={() => setTheme(option.value)}
          >
            <AppPreview theme={option.value} />
            <span className="text-sm font-medium">{option.label}</span>
          </Card>
        ))}
      </div>
    </ScreenShell>
  );
}
