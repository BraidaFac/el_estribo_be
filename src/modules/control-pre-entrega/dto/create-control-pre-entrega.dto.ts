import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EstadoControlPreEntrega } from 'src/modules/common/enums/reservas-domain.enums';

export class CreateControlPreEntregaDto {
  @IsInt()
  reservaId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  aromaScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  aromaObs?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  planchadoScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  planchadoObs?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  sastreriaScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  sastreriaObs?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  higieneScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  higieneObs?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  complementosScore: number;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  complementosObs?: string;

  @IsEnum(EstadoControlPreEntrega)
  estado: EstadoControlPreEntrega;

  @ValidateIf((o) => o.estado === EstadoControlPreEntrega.RECHAZADO)
  @IsNotEmpty()
  @IsString()
  @MaxLength(600)
  motivoRechazo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  auditorNombre: string;
}
