import { ApiProperty } from '@nestjs/swagger';
import { Microsoft365ConnectorResponseDto } from './microsoft-365-connector-response.dto';
import { Microsoft365ConnectionTestResponseDto } from './microsoft-365-connection-test-response.dto';

export class SavedMicrosoft365ConnectorResponseDto extends Microsoft365ConnectorResponseDto {
  @ApiProperty({
    description: 'The test run right after saving',
    type: Microsoft365ConnectionTestResponseDto,
  })
  connectionTest: Microsoft365ConnectionTestResponseDto;
}
