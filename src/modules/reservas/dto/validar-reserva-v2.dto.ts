import { IsBoolean, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class ValidarReservaV2Dto {
  @IsNotEmpty()
  sacoId: number;

  @IsOptional()
  pantalonId?: number;

  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaReserva: string;

  @IsOptional()
  @IsBoolean()
  requiereModista?: boolean;

  /** Recorta bloqueos previos (medición/modista/listo) desde hoy; la lavandería posterior sigue el plan completo. */
  @IsOptional()
  @IsBoolean()
  reservaUltimoMomento?: boolean;
}
