import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoAgendaMedicion } from 'src/modules/common/enums/reservas-domain.enums';

export class ActualizarEstadoAgendaMedicionDto {
  @IsEnum(EstadoAgendaMedicion)
  estado: EstadoAgendaMedicion;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  observaciones?: string;
}
