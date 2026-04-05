import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ReservaExtraItemDto {
  @IsInt()
  accesorioId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacion?: string | null;
}

export class SetReservaExtrasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservaExtraItemDto)
  extras: ReservaExtraItemDto[];
}
