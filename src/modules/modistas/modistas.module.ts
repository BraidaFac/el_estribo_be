import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ModistasController } from './controller/modistas.controller';
import { Modista } from './entity/modista.entity';
import { ModistasService } from './service/modistas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Modista]), AuthModule],
  controllers: [ModistasController],
  providers: [ModistasService],
  exports: [ModistasService, TypeOrmModule],
})
export class ModistasModule {}
