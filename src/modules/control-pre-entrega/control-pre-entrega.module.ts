import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Reserva } from '../reservas/entity/reserva.entity';
import { TareasOperativasModule } from '../tareas-operativas/tareas-operativas.module';
import { ControlPreEntregaController } from './controller/control-pre-entrega.controller';
import { ControlPreEntrega } from './entity/control-pre-entrega.entity';
import { ControlPreEntregaService } from './service/control-pre-entrega.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ControlPreEntrega, Reserva]),
    AuthModule,
    TareasOperativasModule,
  ],
  controllers: [ControlPreEntregaController],
  providers: [ControlPreEntregaService],
  exports: [ControlPreEntregaService],
})
export class ControlPreEntregaModule {}
