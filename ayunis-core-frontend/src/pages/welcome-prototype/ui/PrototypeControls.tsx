import { useState, type ReactNode } from 'react';
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import {
  WELCOME_GRADIENTS,
  type WelcomeGradient,
  type WelcomeJump,
  type WelcomeRole,
} from '@/pages/welcome-prototype/model/welcome-prototype';

const ROLES: ReadonlyArray<{ value: WelcomeRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'Mitarbeitende' },
];

function ControlGroup<T extends string>({
  label,
  value,
  options,
  wrap = false,
  onChange,
}: Readonly<{
  label: string;
  wrap?: boolean;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <Tabs
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) onChange(match.value);
        }}
      >
        <TabsList className={wrap ? 'h-auto flex-wrap' : undefined}>
          {options.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

function Panel({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="wp-controls__panel">{children}</div>;
}

export function PrototypeControls({
  step,
  stepOptions,
  onStepChange,
  role,
  gradient,
  onRoleChange,
  onGradientChange,
  onRestart,
}: Readonly<{
  step: WelcomeJump;
  stepOptions: ReadonlyArray<{ value: WelcomeJump; label: string }>;
  onStepChange: (step: WelcomeJump) => void;
  role: WelcomeRole;
  gradient: WelcomeGradient;
  onRoleChange: (role: WelcomeRole) => void;
  onGradientChange: (gradient: WelcomeGradient) => void;
  onRestart: () => void;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="wp-controls">
      {open && (
        <Panel>
          <ControlGroup
            label="Schritt"
            value={step}
            options={stepOptions}
            wrap
            onChange={onStepChange}
          />
          <ControlGroup
            label="Rolle"
            value={role}
            options={ROLES}
            onChange={onRoleChange}
          />
          <ControlGroup
            label="Gradient"
            value={gradient}
            options={WELCOME_GRADIENTS}
            onChange={onGradientChange}
          />
        </Panel>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="wp-controls__toggle rounded-full"
          aria-label="Neu starten"
          onClick={onRestart}
        >
          <RotateCcw />
        </Button>
        <Button
          variant="outline"
          className="wp-controls__toggle rounded-full"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <SlidersHorizontal />
          Prototyp
          <ChevronDown
            className={
              open ? 'rotate-180 transition-transform' : 'transition-transform'
            }
          />
        </Button>
      </div>
    </div>
  );
}
