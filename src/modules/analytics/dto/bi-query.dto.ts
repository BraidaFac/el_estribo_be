import { IsEnum, IsString, Matches } from 'class-validator';

export type Granularidad = 'SEMANA' | 'MES';

export class BiQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe ser yyyy-MM-dd' })
  desde: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe ser yyyy-MM-dd' })
  hasta: string;

  @IsEnum(['SEMANA', 'MES'])
  granularidad: Granularidad;
}
