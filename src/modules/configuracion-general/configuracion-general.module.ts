import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ConfiguracionGeneralController } from './controller/configuracion-general.controller';
import { ConfiguracionGeneral } from './entity/configuracion-general.entity';
import { ConfiguracionGeneralService } from './service/configuracion-general.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionGeneral]), AuthModule],
  controllers: [ConfiguracionGeneralController],
  providers: [ConfiguracionGeneralService],
  exports: [ConfiguracionGeneralService, TypeOrmModule],
})
export class ConfiguracionGeneralModule {}
