import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

/**
 * Registro de envío a modista por reserva (saco y opcionalmente pantalón).
 */
export class EnviarModistaReservaDto {
  @IsBoolean()
  sacoVaAModista: boolean;

  @ValidateIf((o) => o.sacoVaAModista === true)
  @IsInt()
  sacoModistaId: number;

  @IsOptional()
  @IsBoolean()
  pantalonVaAModista?: boolean;

  @ValidateIf((o) => o.pantalonVaAModista === true)
  @IsInt()
  pantalonModistaId?: number;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
