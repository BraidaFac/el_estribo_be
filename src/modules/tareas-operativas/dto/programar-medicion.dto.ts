import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ProgramarMedicionDto {
  @IsDateString()
  fechaHoraCita: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
