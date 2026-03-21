import { IsOptional, IsString } from 'class-validator';

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
  usuarioId?: string;
}
