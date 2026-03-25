import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProgramarMedicionDto {
  @IsDateString()
  fechaHoraCita: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  /**
   * Si es true, no se valida que la fecha de la cita caiga dentro de la ventana de medición.
   */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  noValidarFecha?: boolean;
}
