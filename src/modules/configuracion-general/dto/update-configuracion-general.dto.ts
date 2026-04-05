import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateConfiguracionGeneralDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  diasLavanderia?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasModista?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  diasTomarMediciones?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadDiasPermitidoRetiro?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dashboardDiasProximasReservas?: number;
}
