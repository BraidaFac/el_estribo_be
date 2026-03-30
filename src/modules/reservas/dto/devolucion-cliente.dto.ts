import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AccionReservaDto } from './accion-reserva.dto';
import {
  BotonesCierresInspeccion,
  DanoGraveInspeccion,
  DecisionLavadoPostDevolucion,
  EstadoGeneralDevolucion,
  RuedosTelasInspeccion,
} from 'src/modules/common/enums/reservas-domain.enums';

export class RecepcionDevolucionPayloadDto {
  @IsEnum(BotonesCierresInspeccion)
  botonesCierresEstado: BotonesCierresInspeccion;

  @IsOptional()
  @IsNumber()
  @Min(0)
  botonesCierresCobro?: number;

  @IsEnum(RuedosTelasInspeccion)
  ruedosTelasEstado: RuedosTelasInspeccion;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ruedosTelasCobro?: number;

  @IsEnum(DanoGraveInspeccion)
  danoGraveEstado: DanoGraveInspeccion;

  @IsOptional()
  @IsNumber()
  @Min(0)
  danoGraveCobro?: number;

  /** Días de demora; omitir o null si no aplica. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  demoraDias?: number | null;

  @IsEnum(EstadoGeneralDevolucion)
  estadoGeneral: EstadoGeneralDevolucion;

  @IsEnum(DecisionLavadoPostDevolucion)
  decisionLavado: DecisionLavadoPostDevolucion;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  responsableLimpiezaLocal?: string | null;
}

export class DevolucionClienteDto extends AccionReservaDto {
  @ValidateNested()
  @Type(() => RecepcionDevolucionPayloadDto)
  recepcion: RecepcionDevolucionPayloadDto;
}
