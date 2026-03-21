import { IsIn, IsOptional, Matches } from 'class-validator';

export class ListarAgendaMedicionesQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;

  /**
   * Si es `true`, devuelve todos los estados en el rango (desde/hasta).
   * Si no se envía o es `false`, excluye ASISTIO y CANCELADA (vista operativa diaria).
   */
  @IsOptional()
  @IsIn(['true', 'false'])
  incluirTodosLosEstados?: string;
}
