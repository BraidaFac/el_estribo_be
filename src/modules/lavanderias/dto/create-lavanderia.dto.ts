import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateLavanderiaDto {
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
