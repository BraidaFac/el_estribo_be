import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFeriadoDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  motivo: string;
}
