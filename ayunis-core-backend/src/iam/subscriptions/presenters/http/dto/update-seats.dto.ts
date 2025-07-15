import { IsNumber } from 'class-validator';

export class UpdateSeatsDto {
  @IsNumber()
  noOfSeats: number;
}
