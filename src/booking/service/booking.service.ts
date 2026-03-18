import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, differenceInCalendarDays, getDay } from 'date-fns';
import { Booking } from 'src/booking/entity/booking.entity';
import { Suit } from 'src/suit/entity/suit.entity';
import { DateUtils } from 'src/utils/date_utils';
import { SuitState } from 'src/utils/suit_utils';
import {
  DataSource,
  In,
  LessThan,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Suit) private suitRepository: Repository<Suit>,
    @InjectRepository(Booking) private bookingRepository: Repository<Booking>,
    private dataSource: DataSource,
  ) {}

  async createBooking(booking: CreateBookingDto) {
    //TODO logica de verificar la reserva ya realizada para una fecha y un traje
    const suitFound: Suit = await this.suitRepository.findOne({
      where: { id: booking.suit.id },
    });
    if (!suitFound) {
      throw new HttpException('Suit Not Found', HttpStatus.NOT_FOUND);
    }
    const newBooking = this.bookingRepository.create(booking);
    console.log(newBooking.booking_date);
    const normalizedDate = DateUtils.normalizeDateOnly(booking.booking_date);
    if (!normalizedDate) {
      throw new HttpException(
        'booking_date must be in yyyy-MM-dd format',
        HttpStatus.BAD_REQUEST,
      );
    }
    newBooking.booking_date = normalizedDate;
    newBooking.booking_created = DateUtils.getTodayDateOnly();

    /* if (newBooking.booking_date < startOfDay(new Date())) {
      throw new HttpException('Date Not Valid', HttpStatus.BAD_REQUEST);
    } */
    this.calculateStartDate(newBooking);
    this.calculateEndDate(newBooking);
    if (!(await this.verifyDisponibility(newBooking))) {
      throw new HttpException(
        'Traje no disponible, verifique las fechas',
        HttpStatus.BAD_REQUEST,
      );
    }
    newBooking.suit = suitFound;
    newBooking.booking_state = 'ACTIVED';
    return this.bookingRepository.save(newBooking);
  }

  getBooking() {
    return this.bookingRepository.find({
      relations: {
        suit: true,
      },
    });
  }
  async updateBooking(id: string, booking: UpdateBookingDto) {
    const bookingFound = await this.bookingRepository.findOne({
      where: { id: Number(id) },
    });

    if (!bookingFound) {
      throw new HttpException('Booking Not Found', HttpStatus.NOT_FOUND);
    }

    if (booking.suit) {
      const suitFound = await this.suitRepository.findOne({
        where: { id: booking.suit.id },
      });
      if (!suitFound) {
        throw new HttpException('Suit Not Found', HttpStatus.NOT_FOUND);
      }
      booking.suit = suitFound;
    }
    delete booking.booking_date;
    Object.assign(bookingFound, booking);

    try {
      return await this.bookingRepository.save(bookingFound);
    } catch {
      throw new HttpException('Error updating booking', HttpStatus.BAD_REQUEST);
    }
  }
  async deleteBooking(id: string) {
    const bookingFound = await this.bookingRepository.findOne({
      where: { id: Number(id) },
    });
    if (!bookingFound) {
      throw new HttpException('Booking Not Found', HttpStatus.NOT_FOUND);
    }
    Object.assign(bookingFound, { booking_state: 'CANCELED' });
    await this.bookingRepository.save(bookingFound);
    return {
      message: 'Booking deleted successfully',
    };
  }
  async getBookingsBySuit(id: string) {
    const suitFound = await this.suitRepository.findOne({
      where: { id },
    });
    if (!suitFound) {
      throw new HttpException('Suit Not Found', HttpStatus.NOT_FOUND);
    }
    const bookings = await this.bookingRepository.find({
      where: {
        suit: suitFound,
        booking_state: In(['ACTIVED', 'INPROGRESS', 'COMPLETED']),
      },
      relations: {
        suit: true,
      },
    });
    console.log(bookings);
    return bookings;
  }

  async getActiveBookingsFromDate(date: string): Promise<Booking[]> {
    const normalizedDate = DateUtils.normalizeDateOnly(date);
    if (!normalizedDate) {
      throw new HttpException(
        'date must be in yyyy-MM-dd format',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.bookingRepository.find({
      where: {
        booking_state: In(['ACTIVED', 'INPROGRESS']),
        booking_date: MoreThanOrEqual(normalizedDate),
      },
      order: {
        booking_date: 'ASC',
      },
      relations: {
        suit: true,
      },
    });
  }

  async cancelBookings(id: string) {
    const bookingFound = await this.bookingRepository.findOne({
      where: { id: Number(id) },
    });
    if (!bookingFound) {
      throw new HttpException('Booking Not Found', HttpStatus.NOT_FOUND);
    }
    bookingFound.booking_state = 'CANCELED';
    return this.bookingRepository.save(bookingFound);
  }

  async getDatesBySuit(id: string, dressmaker?: boolean) {
    const suitFound = await this.suitRepository.findOne({
      where: { id },
    });
    if (!suitFound) {
      throw new HttpException('Suit Not Found', HttpStatus.NOT_FOUND);
    }
    const today = DateUtils.getTodayDateOnly();
    const bookings = await this.bookingRepository.find({
      where: {
        suit: suitFound,
        booking_state: 'ACTIVED',
        booking_date: MoreThanOrEqual(today),
      },
      order: { booking_date: 'ASC' },
      relations: { suit: true },
    });
    const requiredGapDays = dressmaker ? 2 : 1;

    const availableDates = [];
    for (let i = 0; i < bookings.length; i++) {
      if (i === bookings.length - 1) {
        availableDates.push({
          start: bookings[i].end_at,
        });
        break;
      } // Si es el último elemento del array, no se puede comparar con el siguiente (i + 1
      const currentBooking: Booking = bookings[i];
      const nextBooking: Booking = bookings[i + 1];
      const currentBookingEndAt = parseStoredDateValue(
        currentBooking.end_at,
        'end_at',
      );
      const nextBookingStartAt = parseStoredDateValue(
        nextBooking.start_at,
        'start_at',
      );
      const timeDiffDays = differenceInCalendarDays(
        nextBookingStartAt,
        currentBookingEndAt,
      );
      if (timeDiffDays >= 5) {
        for (let j = 1; j <= timeDiffDays; j++) {
          const free_day = addDays(currentBookingEndAt, j);
          if (
            this.verifyPreviousBooking(
              free_day,
              currentBookingEndAt,
              requiredGapDays,
            ) &&
            this.verifyPostBooking(free_day, nextBookingStartAt)
          )
            availableDates.push(free_day);
        }
      }
    }
    return availableDates;
  }

  async getBusyDatesBySuit(id: string) {
    const suitFound = await this.suitRepository.findOne({
      where: { id },
    });
    if (!suitFound) {
      throw new HttpException('Suit Not Found', HttpStatus.NOT_FOUND);
    }
    const bookings = await this.bookingRepository.find({
      where: {
        suit: suitFound,
        booking_state: In(['INPROGRESS', 'ACTIVED', 'COMPLETED']),
      },
      order: { booking_date: 'ASC' },
      relations: { suit: true },
    });

    const busyDates = { laundry: [], dressmaker: [], preparation: [] };

    for (let i = 0; i < bookings.length; i++) {
      const currentBooking: Booking = bookings[i];
      const start_at = parseStoredDateValue(
        currentBooking.start_at,
        'start_at',
      );
      const end_at = parseStoredDateValue(currentBooking.end_at, 'end_at');
      console.log(start_at, end_at);
      const booking_date = parseStoredBookingDate(currentBooking.booking_date);
      const datesInRangeLaundry = getDatesInRangeLaundry(booking_date, end_at);
      const preparation_date = parseStoredBookingDate(
        currentBooking.booking_date,
      );
      preparation_date.setDate(booking_date.getDate() - 1);
      if (currentBooking.dressmaker) {
        const datesInRangeDressmaker = getDatesInRangeDressmaker(
          start_at,
          preparation_date,
        );
        busyDates.dressmaker = [
          ...busyDates.dressmaker,
          ...datesInRangeDressmaker,
        ];
      }
      busyDates.laundry = [...busyDates.laundry, ...datesInRangeLaundry];
      busyDates.preparation = [...busyDates.preparation, preparation_date];
    }
    return busyDates;
  }

  deleteAllBooking() {
    return this.bookingRepository.clear();
  }

  //UTILS
  calculateStartDate(booking: Booking) {
    const bookingDate = parseStoredBookingDate(booking.booking_date);
    const start_date = new Date(bookingDate);
    start_date.setDate(start_date.getDate() - (booking.dressmaker ? 2 : 1));
    booking.start_at = DateUtils.formatDateOnly(start_date);
  }
  calculateEndDate(booking: Booking) {
    const bookingDate = parseStoredBookingDate(booking.booking_date);
    const end_date = new Date(bookingDate);

    if (
      getDay(bookingDate) === 3 || //miercoles
      getDay(bookingDate) === 4 || //jueves
      getDay(bookingDate) === 5 || //viernes
      getDay(bookingDate) === 6 //sabado
    ) {
      end_date.setDate(end_date.getDate() + Number(process.env.LAUNDRY) + 1);
    } else {
      end_date.setDate(end_date.getDate() + Number(process.env.LAUNDRY));
    }
    booking.end_at = DateUtils.formatDateOnly(end_date);
  }

  async verifyDisponibility(booking: Booking) {
    let hsDiffBefore: number;
    let hsDiffAfter: number;
    //En booking_after estaran tambien las reservas de ese mism dia.
    const bookings_after = await this.bookingRepository.find({
      where: {
        booking_state: 'ACTIVED',
        suit: booking.suit,
        booking_date: MoreThanOrEqual(booking.booking_date),
      },
      order: { booking_date: 'ASC' },
    });
    const bookings_before = await this.bookingRepository.find({
      where: {
        booking_state: In(['ACTIVED', 'INPROGRESS']),
        suit: booking.suit,
        booking_date: LessThan(booking.booking_date),
      },
      order: { booking_date: 'DESC' },
    });
    if (bookings_after.length === 0 && bookings_before.length === 0) {
      return true;
    } else if (bookings_after.length === 0) {
      const before_booking = bookings_before[0];
      hsDiffBefore = differenceInCalendarDays(
        parseStoredDateValue(booking.start_at, 'start_at'),
        parseStoredDateValue(before_booking.end_at, 'end_at'),
      );
      if (hsDiffBefore >= 1) {
        return true;
      } else return false;
    } else if (bookings_before.length === 0) {
      const next_booking = bookings_after[0];
      hsDiffAfter = differenceInCalendarDays(
        parseStoredDateValue(next_booking.start_at, 'start_at'),
        parseStoredDateValue(booking.end_at, 'end_at'),
      );
      if (hsDiffAfter >= 1) {
        return true;
      } else return false;
    } else {
      const before_booking = bookings_before[0];
      const next_booking = bookings_after[0];
      hsDiffBefore = differenceInCalendarDays(
        parseStoredDateValue(booking.start_at, 'start_at'),
        parseStoredDateValue(before_booking.end_at, 'end_at'),
      );
      hsDiffAfter = differenceInCalendarDays(
        parseStoredDateValue(next_booking.start_at, 'start_at'),
        parseStoredDateValue(booking.end_at, 'end_at'),
      );
    }
    if (hsDiffBefore >= 1 && hsDiffAfter >= 1) {
      return true;
    }
    return false;
  }

  verifyPreviousBooking(free_day: Date, end_at: Date, requiredGapDays: number) {
    const dayDiff = differenceInCalendarDays(free_day, end_at);
    if (dayDiff >= requiredGapDays) {
      return true;
    } else return false;
  }
  verifyPostBooking(free_day: Date, start_at: Date) {
    const dayDiff = differenceInCalendarDays(start_at, free_day);
    if (
      getDay(free_day) === 4 ||
      getDay(free_day) === 5 ||
      getDay(free_day) === 6
    ) {
      if (dayDiff >= 4) {
        return true;
      } else return false;
    }
    if (dayDiff >= 3) {
      return true;
    } else return false;
  }

  async updateBookingAndSuit(
    booking_id: number,
    booking_state: 'ACTIVED' | 'CANCELED' | 'COMPLETED' | 'INPROGRESS',
    suit_state: SuitState,
    booking_return_suit: string,
    booking_retired_suit: string,
  ) {
    try {
      const res = await this.dataSource.transaction(async (manager) => {
        const booking = await manager.getRepository(Booking).findOne({
          where: {
            id: booking_id,
          },
          relations: ['suit'],
        });

        const suit = booking.suit;
        booking.booking_state = booking_state;
        booking.booking_return_suit = booking_return_suit;
        booking.booking_retired_suit = booking_retired_suit;
        booking.suit.state = suit_state;
        suit.state = suit_state;

        return {
          booking: await manager.save(booking),
          suit: await manager.save(suit),
        };
      });
      return res;
    } catch {
      throw new HttpException('Error updating booking', HttpStatus.BAD_REQUEST);
    }
  }

  getBookingsFuture = async (): Promise<Booking[]> => {
    const bookings = await this.bookingRepository.find({
      where: {
        booking_state: 'ACTIVED',
        booking_date: MoreThan(DateUtils.getTodayDateOnly()),
      },
      relations: ['suit'],
    });
    return bookings;
  };
}
function getDatesInRangeDressmaker(firstDay, endDate) {
  const datesInRange = [];
  const currentDate = new Date(firstDay);

  while (currentDate < endDate) {
    datesInRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return datesInRange;
}
function getDatesInRangeLaundry(firstDay: Date, endDate: Date) {
  const datesInRange = [];
  const currentDate = new Date(firstDay);
  currentDate.setDate(currentDate.getDate() + 1);
  while (currentDate <= endDate) {
    datesInRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return datesInRange;
}
function parseStoredBookingDate(input: string): Date {
  const parsedDate = DateUtils.toDateOnly(input);
  if (!parsedDate) {
    throw new HttpException(
      'booking_date must be in yyyy-MM-dd format',
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsedDate;
}

function parseStoredDateValue(input: string | Date, fieldName: string): Date {
  if (input instanceof Date) {
    return DateUtils.toUtcDateStart(input);
  }

  const parsedDate = DateUtils.toDateOnly(input);
  if (!parsedDate) {
    throw new HttpException(
      `${fieldName} must be in yyyy-MM-dd format`,
      HttpStatus.BAD_REQUEST,
    );
  }

  return parsedDate;
}
