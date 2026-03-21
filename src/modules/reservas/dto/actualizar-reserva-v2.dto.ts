import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarReservaV2Dto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  clienteNombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  clienteDni?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  clienteTelefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombreCuenta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  observaciones?: string;
}
