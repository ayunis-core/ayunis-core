import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import { sectionsIn } from 'src/domain/runs/testing/run-capability.fixture';
import { LegalReferencesCapability } from './legal-references.capability';

describe('LegalReferencesCapability', () => {
  const [policy] = sectionsIn(
    new LegalReferencesCapability().contribute(),
    PromptSlot.POLICIES,
  );

  it('requires structured markers instead of plain German legal citations', () => {
    expect(policy).toContain(
      'Use structured legal-reference markers instead of plain citations when citing German law.',
    );
    expect(policy).toContain('{{legal:SCOPE/CODE/LOCATOR[/PARAGRAPH]}}');
    expect(policy).toContain('{{legal:DE/BGB/sec_433/par_2}}');
    expect(policy).toContain('{{legal:DE-BY/POG/art_1}}');
  });

  it('defines the valid German scopes and supported locator hierarchy', () => {
    expect(policy).toContain(
      'Valid scopes: DE, DE-BW, DE-BY, DE-BE, DE-BB, DE-HB, DE-HH, DE-HE, DE-MV, DE-NI, DE-NW, DE-RP, DE-SL, DE-SN, DE-ST, DE-SH, and DE-TH.',
    );
    expect(policy).toContain(
      'Use sec for sections, art for articles, and optionally append par for a paragraph (Absatz).',
    );
  });

  it('limits legal markers to assistant chat text', () => {
    expect(policy).toContain(
      'Use these markers only in assistant text shown directly in the chat.',
    );
    expect(policy).toContain(
      'Never put them in tool-call arguments or generated content such as documents, emails, spreadsheets, or diagrams.',
    );
  });
});
