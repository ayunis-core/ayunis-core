interface McpInstructionConnection {
  readonly id: string;
  readonly serverName: string;
  readonly instructions?: string;
}

export const buildMcpInstructions = (
  connections: readonly McpInstructionConnection[],
): string => {
  const instructed = connections.filter(({ instructions }) => instructions);
  if (instructed.length === 0) {
    return '';
  }
  return [
    '<active_mcp_connections>',
    ...instructed.map(
      ({ id, serverName, instructions }) =>
        `  <connection id="${escapeXml(id)}" server="${escapeXml(serverName)}">${escapeXml(instructions ?? '')}</connection>`,
    ),
    '</active_mcp_connections>',
  ].join('\n');
};

const escapeXml = (value: string): string =>
  value.replaceAll(
    /[&<>"']/g,
    (character) => XML_ENTITIES[character] ?? character,
  );

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};
