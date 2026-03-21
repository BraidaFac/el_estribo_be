import { IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class QueryReservasRangoDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde: string;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta: string;

  @IsOptional()
  sacoId?: string;
}
