import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Registro de envío a lavandería por reserva (saco y opcionalmente pantalón).
 * La asignación queda en cada prenda; si `*VaALavanderia` es false se cancelan bloqueos LAV de esa prenda.
 */
export class EnviarLavanderiaReservaDto {
  @IsBoolean()
  sacoVaALavanderia: boolean;

  @ValidateIf((o) => o.sacoVaALavanderia === true)
  @IsInt()
  sacoLavanderiaId: number;

  @IsOptional()
  @IsBoolean()
  pantalonVaALavanderia?: boolean;

  @ValidateIf((o) => o.pantalonVaALavanderia === true)
  @IsInt()
  pantalonLavanderiaId?: number;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
