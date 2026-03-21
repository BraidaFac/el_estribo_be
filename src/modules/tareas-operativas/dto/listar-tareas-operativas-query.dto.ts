import {
  EstadoTareaOperativa,
  PrioridadTareaOperativa,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { IsEnum, IsOptional } from 'class-validator';

export class ListarTareasOperativasQueryDto {
  @IsOptional()
  @IsEnum(TipoTareaOperativa)
  tipoTarea?: TipoTareaOperativa;

  @IsOptional()
  @IsEnum(EstadoTareaOperativa)
  estado?: EstadoTareaOperativa;

  @IsOptional()
  @IsEnum(PrioridadTareaOperativa)
  prioridad?: PrioridadTareaOperativa;
}
