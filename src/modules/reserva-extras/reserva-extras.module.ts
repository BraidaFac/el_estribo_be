import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccesoriosModule } from 'src/modules/accesorios/accesorios.module';
import { Accesorio } from 'src/modules/accesorios/entity/accesorio.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ReservaExtrasController } from './controller/reserva-extras.controller';
import { ReservaExtra } from './entity/reserva-extra.entity';
import { ReservaExtrasService } from './service/reserva-extras.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservaExtra, Reserva, Accesorio]),
    AuthModule,
    AccesoriosModule,
  ],
  controllers: [ReservaExtrasController],
  providers: [ReservaExtrasService],
  exports: [ReservaExtrasService, TypeOrmModule],
})
export class ReservaExtrasModule {}
