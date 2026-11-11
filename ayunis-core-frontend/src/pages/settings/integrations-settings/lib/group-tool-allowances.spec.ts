import { describe, expect, it } from 'vitest';
import type { McpToolAllowanceResponseDto } from '@/shared/api';
import { groupToolAllowancesByIntegration } from './group-tool-allowances';

function allowance(
  integrationId: string,
  integrationName: string,
  toolName: string,
): McpToolAllowanceResponseDto {
  return {
    id: `${integrationId}-${toolName}`,
    integrationId,
    integrationName,
    integrationLogoUrl: null,
    toolName,
  };
}

describe('groupToolAllowancesByIntegration', () => {
  it('lists each integration once with all of its tools', () => {
    const groups = groupToolAllowancesByIntegration([
      allowance('oparl', 'OParl', 'search_meetings'),
      allowance('locaboo', 'Locaboo', 'create_booking'),
      allowance('oparl', 'OParl', 'get_agenda_item'),
    ]);

    expect(
      groups.map((group) => [
        group.integrationName,
        group.allowances.map((entry) => entry.toolName),
      ]),
    ).toEqual([
      ['Locaboo', ['create_booking']],
      ['OParl', ['get_agenda_item', 'search_meetings']],
    ]);
  });

  it('keeps integrations with the same name apart', () => {
    const groups = groupToolAllowancesByIntegration([
      allowance('first', 'Ratsinformation', 'search_meetings'),
      allowance('second', 'Ratsinformation', 'search_meetings'),
    ]);

    expect(groups.map((group) => group.integrationId)).toEqual([
      'first',
      'second',
    ]);
  });
});
