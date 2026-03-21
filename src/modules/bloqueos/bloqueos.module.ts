import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { CalendarioLaboralModule } from '../calendario-laboral/calendario-laboral.module';
import { ConfiguracionGeneralModule } from '../configuracion-general/configuracion-general.module';
import { BloqueosController } from './controller/bloqueos.controller';
import { BloqueoPrenda } from './entity/bloqueo-prenda.entity';
import { BloqueoPrendaEvento } from './entity/bloqueo-prenda-evento.entity';
import { BloqueoPlannerService } from './service/bloqueo-planner.service';
import { BloqueosService } from './service/bloqueos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BloqueoPrenda, BloqueoPrendaEvento]),
    AuthModule,
    CalendarioLaboralModule,
    ConfiguracionGeneralModule,
  ],
  controllers: [BloqueosController],
  providers: [BloqueosService, BloqueoPlannerService],
  exports: [BloqueosService, BloqueoPlannerService, TypeOrmModule],
})
export class BloqueosModule {}
