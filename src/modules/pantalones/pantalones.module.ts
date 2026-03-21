import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { PantalonesController } from './controller/pantalones.controller';
import { Pantalon } from './entity/pantalon.entity';
import { PantalonesService } from './service/pantalones.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pantalon]), AuthModule],
  controllers: [PantalonesController],
  providers: [PantalonesService],
  exports: [PantalonesService, TypeOrmModule],
})
export class PantalonesModule {}
