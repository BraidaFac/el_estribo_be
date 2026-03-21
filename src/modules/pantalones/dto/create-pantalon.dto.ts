import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CondicionPrenda } from 'src/modules/common/enums/reservas-domain.enums';

export class CreatePantalonDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsOptional()
  @IsString()
  talle?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsEnum(CondicionPrenda)
  condicion?: CondicionPrenda;
}
