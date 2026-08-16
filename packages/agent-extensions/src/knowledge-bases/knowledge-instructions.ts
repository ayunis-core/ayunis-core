interface KnowledgeBaseInstructionSummary {
  readonly id: string;
  readonly name: string;
}

export const buildKnowledgeInstructions = (
  knowledgeBases: readonly KnowledgeBaseInstructionSummary[],
): string => {
  if (knowledgeBases.length === 0) {
    return '';
  }
  const entries = knowledgeBases
    .map(
      ({ id, name }) =>
        `<knowledge_base id="${escapeXml(id)}" name="${escapeXml(name)}" />`,
    )
    .join('\n');
  return [
    '<available_knowledge_bases>',
    'Use knowledge_query to search these knowledge bases and knowledge_get_text to read exact document sections.',
    entries,
    '</available_knowledge_bases>',
  ].join('\n');
};

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

const escapeXml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (character) => XML_ENTITIES[character] ?? character,
  );
