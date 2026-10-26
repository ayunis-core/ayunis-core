import { randomUUID } from 'crypto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { resolveModelMode } from './resolve-model-mode.helper';

const orgId = randomUUID();

const model = (
  name: string,
  opts: {
    isArchived?: boolean;
    hasProviderFault?: boolean;
    tier?: ModelTier;
  } = {},
): LanguageModel =>
  new LanguageModel({
    id: randomUUID(),
    name,
    provider: ModelProvider.MISTRAL,
    displayName: name,
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: false,
    contextWindowSize: 128_000,
    isArchived: opts.isArchived ?? false,
    hasProviderFault: opts.hasProviderFault,
    tier: opts.tier ?? ModelTier.HIGH,
  });

const permit = (m: LanguageModel, anonymousOnly = false) =>
  new PermittedLanguageModel({ model: m, orgId, anonymousOnly });

const entries = (mode: ModelMode, ...items: [LanguageModel, boolean?][]) =>
  items.map(
    ([m, enabled = true], position) =>
      new ModelModeEntry({ mode, model: m, position, enabled }),
  );

describe('resolveModelMode', () => {
  const large = model('mistral-large');
  const small = model('mistral-small');

  it('picks the first entry the user is permitted to use', () => {
    const notPermitted = model('claude');
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [notPermitted], [large], [small]),
      [permit(small), permit(large)],
      false,
    );
    expect(result?.model.id).toBe(large.id);
  });

  it('skips disabled entries', () => {
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [large, false], [small]),
      [permit(large), permit(small)],
      false,
    );
    expect(result?.model.id).toBe(small.id);
  });

  it('skips archived models', () => {
    const archived = model('old', { isArchived: true });
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [archived], [small]),
      [permit(archived), permit(small)],
      false,
    );
    expect(result?.model.id).toBe(small.id);
  });

  it('skips models with a provider fault while a healthy one qualifies', () => {
    const faulty = model('faulty', { hasProviderFault: true });
    const result = resolveModelMode(
      ModelMode.MAX,
      entries(ModelMode.MAX, [faulty], [large]),
      [permit(faulty), permit(large)],
      false,
    );
    expect(result?.model.id).toBe(large.id);
  });

  it('skips anonymous-only grants while anonymous mode is off', () => {
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [large], [small]),
      [permit(large, true), permit(small)],
      false,
    );
    expect(result?.model.id).toBe(small.id);
  });

  it('accepts anonymous-only grants while anonymous mode is on', () => {
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [large], [small]),
      [permit(large, true), permit(small)],
      true,
    );
    expect(result?.model.id).toBe(large.id);
  });

  it('falls back to the first faulted permitted model for auto', () => {
    const faulty = model('faulty', { hasProviderFault: true });
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [faulty]),
      [permit(faulty)],
      false,
    );
    expect(result?.model.id).toBe(faulty.id);
  });

  it('never falls back to an anonymous-only faulted model while anonymous mode is off', () => {
    const faulty = model('faulty', { hasProviderFault: true });
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [faulty]),
      [permit(faulty, true)],
      false,
    );
    expect(result).toBeNull();
  });

  it('does not fall back to a faulted model for max', () => {
    const faulty = model('faulty', { hasProviderFault: true });
    const result = resolveModelMode(
      ModelMode.MAX,
      entries(ModelMode.MAX, [faulty]),
      [permit(faulty)],
      false,
    );
    expect(result).toBeNull();
  });

  it('resolves to nothing when no entry is permitted', () => {
    expect(
      resolveModelMode(
        ModelMode.AUTO,
        entries(ModelMode.AUTO, [large]),
        [permit(small)],
        false,
      ),
    ).toBeNull();
  });

  it('skips a Max entry whose model is no longer high tier', () => {
    const downgraded = model('downgraded', { tier: ModelTier.MEDIUM });
    const result = resolveModelMode(
      ModelMode.MAX,
      entries(ModelMode.MAX, [downgraded], [large]),
      [permit(downgraded), permit(large)],
      false,
    );
    expect(result?.model.id).toBe(large.id);
  });

  it('keeps a medium-tier model eligible for Auto', () => {
    const medium = model('medium', { tier: ModelTier.MEDIUM });
    const result = resolveModelMode(
      ModelMode.AUTO,
      entries(ModelMode.AUTO, [medium]),
      [permit(medium)],
      false,
    );
    expect(result?.model.id).toBe(medium.id);
  });
});
