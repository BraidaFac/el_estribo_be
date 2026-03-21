import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { CalendarioLaboralController } from './controller/calendario-laboral.controller';
import { FeriadosController } from './controller/feriados.controller';
import { Feriado } from './entity/feriado.entity';
import { CalendarioLaboralService } from './service/calendario-laboral.service';
import { FeriadosCargaInicialService } from './service/feriados-carga-inicial.service';
import { FeriadosService } from './service/feriados.service';

@Module({
  imports: [TypeOrmModule.forFeature([Feriado]), AuthModule],
  controllers: [CalendarioLaboralController, FeriadosController],
  providers: [
    CalendarioLaboralService,
    FeriadosService,
    FeriadosCargaInicialService,
  ],
  exports: [CalendarioLaboralService, FeriadosService, TypeOrmModule],
})
export class CalendarioLaboralModule {}
