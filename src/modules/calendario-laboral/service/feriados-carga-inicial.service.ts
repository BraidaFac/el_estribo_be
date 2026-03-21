import { Injectable, OnModuleInit } from '@nestjs/common';
import { FeriadosService } from './feriados.service';

/**
 * Dispara la carga idempotente de feriados oficiales (año actual) al arrancar el backend.
 */
@Injectable()
export class FeriadosCargaInicialService implements OnModuleInit {
  constructor(private readonly feriadosService: FeriadosService) {}

  onModuleInit(): void {
    void this.feriadosService.ensureFeriadosOficialesAnoActualDesdeApi();
  }
}
