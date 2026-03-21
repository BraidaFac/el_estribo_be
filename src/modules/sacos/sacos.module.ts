import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { SacosController } from './controller/sacos.controller';
import { Saco } from './entity/saco.entity';
import { SacosService } from './service/sacos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Saco]), AuthModule],
  controllers: [SacosController],
  providers: [SacosService],
  exports: [SacosService, TypeOrmModule],
})
export class SacosModule {}
