import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { LavanderiasController } from './controller/lavanderias.controller';
import { Lavanderia } from './entity/lavanderia.entity';
import { PrecioHistoricoLavanderia } from './entity/precio-historico-lavanderia.entity';
import { LavanderiasService } from './service/lavanderias.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lavanderia, PrecioHistoricoLavanderia]),
    AuthModule,
  ],
  controllers: [LavanderiasController],
  providers: [LavanderiasService],
  exports: [LavanderiasService, TypeOrmModule],
})
export class LavanderiasModule {}
