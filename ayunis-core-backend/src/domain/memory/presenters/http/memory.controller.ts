import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FindUserMemoryUseCase } from 'src/domain/memory/application/use-cases/find-user-memory/find-user-memory.use-case';
import { UpsertMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/upsert-memory-entry/upsert-memory-entry.use-case';
import { UpsertMemoryEntryCommand } from 'src/domain/memory/application/use-cases/upsert-memory-entry/upsert-memory-entry.command';
import { DeleteMemoryEntryUseCase } from 'src/domain/memory/application/use-cases/delete-memory-entry/delete-memory-entry.use-case';
import { DeleteMemoryEntryCommand } from 'src/domain/memory/application/use-cases/delete-memory-entry/delete-memory-entry.command';
import { ClearUserMemoryUseCase } from 'src/domain/memory/application/use-cases/clear-user-memory/clear-user-memory.use-case';
import { MemoryEntryDtoMapper } from './mappers/memory-entry.mapper';
import { MemoryEntryResponseDto } from './dtos/memory-entry-response.dto';
import { MemoryResponseDto } from './dtos/memory-response.dto';
import { UpsertMemoryEntryDto } from './dtos/upsert-memory-entry.dto';

@ApiTags('Memory')
@Controller('memory')
@ApiResponse({
  status: 404,
  description: 'Memory is not enabled for this organization',
})
export class MemoryController {
  constructor(
    private readonly findUserMemoryUseCase: FindUserMemoryUseCase,
    private readonly upsertMemoryEntryUseCase: UpsertMemoryEntryUseCase,
    private readonly deleteMemoryEntryUseCase: DeleteMemoryEntryUseCase,
    private readonly clearUserMemoryUseCase: ClearUserMemoryUseCase,
    private readonly mapper: MemoryEntryDtoMapper,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the memory of the authenticated user',
    description:
      'Returns every memory entry of the authenticated user. The reserved keys are always included, even when the assistant has not written them yet.',
  })
  @ApiResponse({
    status: 200,
    description: 'The memory of the authenticated user',
    type: MemoryResponseDto,
  })
  async findAll(): Promise<MemoryResponseDto> {
    const entries = await this.findUserMemoryUseCase.execute();

    return { entries: this.mapper.toListDto(entries) };
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Create or replace a memory entry',
    description:
      'Replaces the whole snippet stored under this key for the authenticated user.',
  })
  @ApiBody({ type: UpsertMemoryEntryDto })
  @ApiResponse({
    status: 200,
    description: 'The stored memory entry',
    type: MemoryEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid key or content' })
  async upsert(
    @Param('key') key: string,
    @Body() dto: UpsertMemoryEntryDto,
  ): Promise<MemoryEntryResponseDto> {
    const entry = await this.upsertMemoryEntryUseCase.execute(
      new UpsertMemoryEntryCommand(key, dto.content, dto.description),
    );

    return this.mapper.toDto(entry);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a memory entry',
    description:
      'Removes the entry. A reserved key stays available to the assistant and becomes empty.',
  })
  @ApiResponse({ status: 204, description: 'The entry no longer exists' })
  async delete(@Param('key') key: string): Promise<void> {
    await this.deleteMemoryEntryUseCase.execute(
      new DeleteMemoryEntryCommand(key),
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete the whole memory of the authenticated user',
  })
  @ApiResponse({ status: 204, description: 'The memory is empty' })
  async clear(): Promise<void> {
    await this.clearUserMemoryUseCase.execute();
  }
}
