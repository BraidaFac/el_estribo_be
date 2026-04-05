import { IsOptional, IsString } from 'class-validator';

export class AccionTareaOperativaDto {
  @IsOptional()
  @IsString()
  motivo?: string;

  /** Populated by the controller from the JWT; never read from the request body. */
  usuarioId?: string;
}
