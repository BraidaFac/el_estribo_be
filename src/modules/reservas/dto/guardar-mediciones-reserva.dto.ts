import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo libre con `saco` y/o `pantalon`: objetos con claves de medida y valores número o null.
 * La sanitización ocurre en el servicio (solo claves conocidas).
 */
export class GuardarMedicionesReservaDto {
  @IsOptional()
  saco?: Record<string, unknown>;

  @IsOptional()
  pantalon?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacionSaco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacionPantalon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacionGeneral?: string;

  @IsOptional()
  @IsBoolean()
  sinModista?: boolean;
}
