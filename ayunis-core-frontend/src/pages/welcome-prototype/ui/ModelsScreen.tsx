import { Fragment, useState } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { MODEL_TIERS } from '@/pages/welcome-prototype/model/welcome-prototype';
import { ScreenShell } from './ScreenShell';

const MODELS = MODEL_TIERS.flatMap((tier) => tier.models);

export function ModelsScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(MODELS.map((model) => model.name)),
  );

  function toggle(name: string, checked: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  return (
    <ScreenShell
      title="Welche Modelle möchten Sie freischalten?"
      hint="Alle laufen in Rechenzentren in Deutschland oder der EU."
      nextLabel={
        picked.size === 1
          ? '1 Modell freischalten'
          : `${picked.size} Modelle freischalten`
      }
      nextDisabled={picked.size === 0}
      onNext={onDone}
      onBack={onBack}
    >
      <ItemGroup className="bg-background w-[28rem] max-w-full rounded-xl border text-left">
        {MODELS.map((model, index) => (
          <Fragment key={model.name}>
            {index > 0 && <ItemSeparator />}
            <Item size="sm" className="rounded-none py-1.5" asChild>
              <label className="cursor-pointer">
                <ItemContent>
                  <ItemTitle>
                    <ProviderFlag
                      provider={model.provider}
                      className="size-3.5"
                    />
                    {model.name}
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={picked.has(model.name)}
                    onCheckedChange={(checked) => toggle(model.name, checked)}
                  />
                </ItemActions>
              </label>
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </ScreenShell>
  );
}
