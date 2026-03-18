import { Module } from '@nestjs/common';
import { SuitController } from './controller/suit.controller';
import { SuitService } from './service/suit.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Suit } from './entity/suit.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Suit]), AuthModule],
  controllers: [SuitController],
  providers: [SuitService],
})
export class SuitModule {}
