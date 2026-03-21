import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { BloqueosModule } from '../bloqueos/bloqueos.module';
import { BloqueoPrenda } from '../bloqueos/entity/bloqueo-prenda.entity';
import { BloqueoPrendaEvento } from '../bloqueos/entity/bloqueo-prenda-evento.entity';
import { ConfiguracionGeneralModule } from '../configuracion-general/configuracion-general.module';
import { Lavanderia } from '../lavanderias/entity/lavanderia.entity';
import { Modista } from '../modistas/entity/modista.entity';
import { OperacionesPrendaModule } from '../operaciones-prenda/operaciones-prenda.module';
import { Pantalon } from '../pantalones/entity/pantalon.entity';
import { PantalonesModule } from '../pantalones/pantalones.module';
import { TareasOperativasModule } from '../tareas-operativas/tareas-operativas.module';
import { ReservasV2Controller } from './controller/reservas-v2.controller';
import { SacosModule } from '../sacos/sacos.module';
import { Saco } from '../sacos/entity/saco.entity';
import { AsignacionServicioReserva } from './entity/asignacion-servicio-reserva.entity';
import { MedicionReserva } from './entity/medicion-reserva.entity';
import { Reserva } from './entity/reserva.entity';
import { DisponibilidadService } from './service/disponibilidad.service';
import { MedicionesReservaService } from './service/mediciones-reserva.service';
import { ReservasV2Service } from './service/reservas-v2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reserva,
      AsignacionServicioReserva,
      MedicionReserva,
      BloqueoPrenda,
      BloqueoPrendaEvento,
      Saco,
      Pantalon,
      Lavanderia,
      Modista,
    ]),
    AuthModule,
    SacosModule,
    PantalonesModule,
    BloqueosModule,
    ConfiguracionGeneralModule,
    OperacionesPrendaModule,
    TareasOperativasModule,
  ],
  controllers: [ReservasV2Controller],
  providers: [DisponibilidadService, ReservasV2Service, MedicionesReservaService],
  exports: [
    ReservasV2Service,
    DisponibilidadService,
    MedicionesReservaService,
    TypeOrmModule,
  ],
})
export class ReservasModule {}
