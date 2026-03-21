import { IsOptional, IsString } from 'class-validator';

export class AccionTareaOperativaDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
