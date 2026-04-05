import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ControlPreEntrega } from '../control-pre-entrega/entity/control-pre-entrega.entity';
import { RecepcionDevolucionReserva } from '../reservas/entity/recepcion-devolucion-reserva.entity';
import { AnalyticsController } from './controller/analytics.controller';
import { AnalyticsService } from './service/analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ControlPreEntrega, RecepcionDevolucionReserva]),
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
