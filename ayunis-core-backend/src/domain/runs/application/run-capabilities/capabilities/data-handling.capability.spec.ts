import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import { sectionsIn } from 'src/domain/runs/testing/run-capability.fixture';
import { DataHandlingCapability } from './data-handling.capability';

describe('DataHandlingCapability', () => {
  it('contributes the privacy and multi-tenant policies', () => {
    const [policy] = sectionsIn(
      new DataHandlingCapability().contribute(),
      PromptSlot.POLICIES,
    );

    expect(policy).toContain('<privacy_principles>');
    expect(policy).toContain('<multi_tenant_context>');
  });
});
