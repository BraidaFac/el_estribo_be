import { Module } from '@nestjs/common';
import { BookingController } from './controller/booking.controller';
import { BookingService } from './service/booking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entity/booking.entity';
import { Suit } from 'src/suit/entity/suit.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Suit]), AuthModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
