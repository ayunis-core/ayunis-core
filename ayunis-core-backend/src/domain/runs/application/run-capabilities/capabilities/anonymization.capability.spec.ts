import {
  aCapabilityContext,
  promptText,
} from 'src/domain/runs/testing/run-capability.fixture';
import { AnonymizationCapability } from './anonymization.capability';

describe('AnonymizationCapability', () => {
  const capability = new AnonymizationCapability();

  it('explains the PII placeholders in anonymous runs', () => {
    const text = promptText(
      capability.contribute(aCapabilityContext({ isAnonymous: true })),
    );

    expect(text).toContain('<anonymized_data>');
    expect(text).toContain('{{pii:CATEGORY_NUMBER}}');
    expect(text).toContain('copy its placeholder verbatim');
  });

  it('contributes nothing to regular runs', () => {
    expect(capability.contribute(aCapabilityContext())).toEqual({});
  });
});
