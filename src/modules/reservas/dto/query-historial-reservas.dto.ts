import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function trimOrUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

export class QueryHistorialReservasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  /**
   * Texto único: coincide si aplica a Nº reserva (como texto), nombre cliente, DNI,
   * código saco o código pantalón (OR).
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOrUndefined(value))
  @MaxLength(160)
  buscar?: string;
}
