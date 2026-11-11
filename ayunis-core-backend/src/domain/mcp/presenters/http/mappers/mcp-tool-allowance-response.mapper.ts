import { Injectable } from '@nestjs/common';
import type { McpToolAllowanceListItem } from 'src/domain/mcp/application/use-cases/list-mcp-tool-allowances/list-mcp-tool-allowances.use-case';
import type { McpToolAllowanceResponseDto } from 'src/domain/mcp/presenters/http/dto/mcp-tool-allowance-response.dto';

@Injectable()
export class McpToolAllowanceResponseMapper {
  toDto(item: McpToolAllowanceListItem): McpToolAllowanceResponseDto {
    return {
      id: item.allowance.id,
      integrationId: item.allowance.integrationId,
      integrationName: item.integrationName,
      integrationLogoUrl: item.integrationLogoUrl,
      toolName: item.allowance.toolName,
    };
  }
}
