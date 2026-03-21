import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { BloqueosModule } from '../bloqueos/bloqueos.module';
import { Lavanderia } from '../lavanderias/entity/lavanderia.entity';
import { Modista } from '../modistas/entity/modista.entity';
import { Pantalon } from '../pantalones/entity/pantalon.entity';
import { OperacionesPrendaModule } from '../operaciones-prenda/operaciones-prenda.module';
import { AsignacionServicioReserva } from '../reservas/entity/asignacion-servicio-reserva.entity';
import { Reserva } from '../reservas/entity/reserva.entity';
import { Saco } from '../sacos/entity/saco.entity';
import { TareasOperativasController } from './controller/tareas-operativas.controller';
import { AgendaMedicion } from './entity/agenda-medicion.entity';
import { TareaOperativa } from './entity/tarea-operativa.entity';
import { TareasOperativasService } from './service/tareas-operativas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TareaOperativa,
      AgendaMedicion,
      AsignacionServicioReserva,
      Reserva,
      Saco,
      Pantalon,
      Lavanderia,
      Modista,
    ]),
    AuthModule,
    BloqueosModule,
    OperacionesPrendaModule,
  ],
  controllers: [TareasOperativasController],
  providers: [TareasOperativasService],
  exports: [TareasOperativasService, TypeOrmModule],
})
export class TareasOperativasModule {}
