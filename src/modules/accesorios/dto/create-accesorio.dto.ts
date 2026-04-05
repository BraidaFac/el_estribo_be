import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAccesorioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  icono: string;
}
