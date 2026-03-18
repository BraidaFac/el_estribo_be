import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsString,
  Matches,
} from 'class-validator';
import { Suit } from 'src/suit/entity/suit.entity';

export class CreateBookingDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'booking_date must be in yyyy-MM-dd format',
  })
  booking_date: string;
  booking_state: 'ACTIVED' | 'CANCELED' | 'COMPLETED' | 'INPROGRESS';
  @IsNotEmpty()
  @IsObject()
  suit: Suit;
  @IsNotEmpty()
  @IsString()
  client_dni: string;
  @IsNotEmpty()
  @IsString()
  client_name: string;
  @IsNotEmpty()
  @IsString()
  client_phone: string;
  @IsNotEmpty()
  @IsString()
  account_related: string;
  @IsString()
  observations: string;
  @IsBoolean()
  dressmaker: boolean;
  booking_retired_suit: string;
  booking_return_suit: string;
}
