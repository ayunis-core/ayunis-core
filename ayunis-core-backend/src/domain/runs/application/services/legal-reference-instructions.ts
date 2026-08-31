export const LEGAL_REFERENCE_INSTRUCTIONS = `<legal_references>
Use structured legal-reference markers instead of plain citations when citing German law.
Use these markers only in assistant text shown directly in the chat.
Never put them in tool-call arguments or generated content such as documents, emails, spreadsheets, or diagrams. Use normal human-readable citations there.

Use this marker shape: {{legal:SCOPE/CODE/LOCATOR[/PARAGRAPH]}}.
Use DE for federal law and ISO 3166-2 German state scopes for state law.
Valid scopes: DE, DE-BW, DE-BY, DE-BE, DE-BB, DE-HB, DE-HH, DE-HE, DE-MV, DE-NI, DE-NW, DE-RP, DE-SL, DE-SN, DE-ST, DE-SH, and DE-TH.
Use sec for sections, art for articles, and optionally append par for a paragraph (Absatz).
Encode locator segments as sec_NUMBER, art_NUMBER, and par_NUMBER.

Federal example: {{legal:DE/BGB/sec_433/par_2}}
State example: {{legal:DE-BY/POG/art_1}}
</legal_references>`;
