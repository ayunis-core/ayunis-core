import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GenerateIcsUseCase } from '../../application/use-cases/generate-ics/generate-ics.use-case';
import { GenerateIcsCommand } from '../../application/use-cases/generate-ics/generate-ics.command';
import { GenerateIcsDto } from './dto/generate-ics.dto';

@ApiTags('tools')
@Controller('tools/calendar')
export class CalendarController {
  constructor(private readonly generateIcsUseCase: GenerateIcsUseCase) {}

  @Post('ics')
  @ApiOperation({ summary: 'Generate an .ics calendar file for an event' })
  @ApiBody({ type: GenerateIcsDto })
  @ApiResponse({ status: 200, description: 'Returns ICS content' })
  @ApiResponse({ status: 400, description: 'Invalid input or date range' })
  @ApiResponse({ status: 500, description: 'Failed to generate ICS content' })
  generateIcs(@Body() dto: GenerateIcsDto, @Res() res: Response) {
    const command = new GenerateIcsCommand(
      dto.title,
      dto.start,
      dto.end,
      dto.description,
      dto.location,
    );
    const ics = this.generateIcsUseCase.execute(command);

    const filename = `event-${Date.now()}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(ics);
  }
}
