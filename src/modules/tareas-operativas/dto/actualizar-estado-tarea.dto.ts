import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoTareaOperativa } from 'src/modules/common/enums/reservas-domain.enums';

export class ActualizarEstadoTareaDto {
  @IsEnum(EstadoTareaOperativa)
  estado: EstadoTareaOperativa;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
