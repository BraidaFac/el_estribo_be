import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AccesoriosController } from './controller/accesorios.controller';
import { Accesorio } from './entity/accesorio.entity';
import { AccesoriosService } from './service/accesorios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Accesorio]), AuthModule],
  controllers: [AccesoriosController],
  providers: [AccesoriosService],
  exports: [AccesoriosService, TypeOrmModule],
})
export class AccesoriosModule {}
