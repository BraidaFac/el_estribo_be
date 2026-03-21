import { IsOptional, IsString } from 'class-validator';

export class AccionReservaDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
