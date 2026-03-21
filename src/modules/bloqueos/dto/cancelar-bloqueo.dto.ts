import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelarBloqueoDto {
  @IsNotEmpty()
  @IsString()
  motivoCancelacion: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
