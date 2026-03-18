import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { SuitState } from 'src/utils/suit_utils';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { BookingService } from '../service/booking.service';

@Controller('booking')
@UseGuards(AuthGuard)
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get()
  getBookings() {
    return this.bookingService.getBooking();
  }
  @Get('reservas')
  getBookingsFuture() {
    return this.bookingService.getBookingsFuture();
  }
  @Get('active')
  getActiveBookingsFromDate(@Query('date') date: string) {
    return this.bookingService.getActiveBookingsFromDate(date);
  }
  @Post()
  createBooking(@Body() booking: CreateBookingDto) {
    return this.bookingService.createBooking(booking);
  }
  @Patch('/:id')
  updateBooking(@Param('id') id: string, @Body() booking: UpdateBookingDto) {
    return this.bookingService.updateBooking(id, booking);
  }
  @Delete('/:id')
  deleteBooking(@Param('id') id: string) {
    return this.bookingService.deleteBooking(id);
  }
  @Delete()
  deleteAllBooking() {
    return this.bookingService.deleteAllBooking();
  }
  @Get('suit/:id')
  getBookingsBySuit(@Param('id') id: string) {
    return this.bookingService.getBookingsBySuit(id);
  }
  @Get('suit/:id/fechas')
  getDatesBySuit(@Param('id') id: string) {
    return this.bookingService.getBusyDatesBySuit(id);
  }
  @Patch('/:id/estados')
  updateBokingAndSuit(
    @Param('id') booking_id: string,
    @Body()
    states: {
      booking_state: 'ACTIVED' | 'CANCELED' | 'COMPLETED' | 'INPROGRESS';
      suit_state: SuitState;
      booking_return_suit?: string;
      booking_retired_suit?: string;
    },
  ) {
    return this.bookingService.updateBookingAndSuit(
      +booking_id,
      states.booking_state,
      states.suit_state,
      states.booking_return_suit,
      states.booking_retired_suit,
    );
  }
}
