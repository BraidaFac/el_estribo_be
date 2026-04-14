import { IsDateString, IsNumber, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreatePrecioHistoricoDto {
  @IsNumber()
  @Min(0.01)
  precio: number;

  @IsDateString()
  vigenciaDesde: string;
}

export class UpdatePrecioHistoricoDto extends PartialType(
  CreatePrecioHistoricoDto,
) {}
