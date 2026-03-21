import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pantalon } from '../pantalones/entity/pantalon.entity';
import { Reserva } from '../reservas/entity/reserva.entity';
import { Saco } from '../sacos/entity/saco.entity';
import { MovimientoPrenda } from './entity/movimiento-prenda.entity';
import { OperacionesPrendaService } from './service/operaciones-prenda.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoPrenda, Saco, Pantalon, Reserva]),
  ],
  providers: [OperacionesPrendaService],
  exports: [OperacionesPrendaService, TypeOrmModule],
})
export class OperacionesPrendaModule {}
