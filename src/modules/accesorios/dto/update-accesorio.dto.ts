import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAccesorioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  icono?: string;
}
