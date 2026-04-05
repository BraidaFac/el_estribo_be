import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class DevolucionExtraItemDto {
  @IsInt()
  extraId: number;

  @IsBoolean()
  devuelto: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacionDevolucion?: string | null;
}

export class PatchDevolucionExtrasDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevolucionExtraItemDto)
  extras: DevolucionExtraItemDto[];
}
