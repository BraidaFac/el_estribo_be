import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoPasoCompletado, TipoPrenda } from 'src/modules/common/enums/reservas-domain.enums';

export class PasoCompletadoDto {
  id: string;
  tipo: TipoPasoCompletado;
  descripcion: string;
  fechaCompletado: string;
  tipoPrenda?: TipoPrenda;
  tareaId?: number;
  agendaId?: number;
  puedeRevertirse: boolean;
}

export class RevertirUltimoPasoDto {
  @IsEnum(TipoPasoCompletado)
  tipo: TipoPasoCompletado;

  @IsOptional()
  @IsNumber()
  tareaId?: number;

  @IsOptional()
  @IsNumber()
  agendaId?: number;

  @IsString()
  @MaxLength(300)
  motivo: string;
}
