import {
  EstadoTareaOperativa,
  PrioridadTareaOperativa,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';

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

  /** IDs de reserva separados por coma (ej. `1,2,3`) para filtrar tareas. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    const raw = Array.isArray(value) ? value : String(value).split(',');
    const ids = raw
      .map((v) => parseInt(String(v).trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0);
    return ids.length ? ids : undefined;
  })
  @IsArray()
  @IsInt({ each: true })
  reservaIds?: number[];
}
