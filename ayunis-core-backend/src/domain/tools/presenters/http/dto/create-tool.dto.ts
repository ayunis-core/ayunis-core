import { IsJsonSchema } from 'src/common/validators/jsonSchema.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsUrl } from 'class-validator';
import { HttpToolMethod } from 'src/domain/tools/domain/tools/http-tool.entity';

// Base DTO with common properties for all tool types
export class CreateToolBaseDto {
  @ApiProperty({ description: 'Display name of the tool' })
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ description: 'Description of what the tool does' })
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'JSON Schema defining the parameters the tool accepts',
    example: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
      },
    },
  })
  @IsNotEmpty()
  @IsJsonSchema()
  parameters: Record<string, any>;
}

// HTTP tool specific DTO
export class CreateHttpToolDto extends CreateToolBaseDto {
  @ApiProperty({
    description: 'Endpoint URL for the HTTP tool',
    example: 'https://api.example.com/search',
  })
  @IsUrl()
  @IsNotEmpty()
  endpointUrl: string;

  @ApiProperty({
    description: 'HTTP method for the HTTP tool',
    example: 'GET',
  })
  @IsNotEmpty()
  @IsEnum(HttpToolMethod)
  method: HttpToolMethod;
}

// Weather tool specific DTO
export class CreateWeatherToolDto extends CreateToolBaseDto {}
