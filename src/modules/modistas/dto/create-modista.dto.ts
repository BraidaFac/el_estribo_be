import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateModistaDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsBoolean()
  predeterminada?: boolean;
}
