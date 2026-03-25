import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateReservaV2Dto {
  @IsNotEmpty()
  sacoId: number;

  @IsOptional()
  pantalonId?: number;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaReserva: string;

  @IsString()
  @IsNotEmpty()
  clienteDni: string;

  @IsString()
  @IsNotEmpty()
  clienteNombre: string;

  @IsOptional()
  @IsString()
  clienteTelefono?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  nombreCuenta?: string;

  @IsOptional()
  @IsBoolean()
  requiereModista?: boolean;

  @IsOptional()
  @IsBoolean()
  reservaUltimoMomento?: boolean;
}
