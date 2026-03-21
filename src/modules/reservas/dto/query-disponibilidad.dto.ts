import { IsNotEmpty, Matches } from 'class-validator';

export class QueryDisponibilidadDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta: string;
}
