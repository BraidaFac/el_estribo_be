import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, subDays } from 'date-fns';
import { DateUtils } from 'src/utils/date_utils';
import { SuitState } from 'src/utils/suit_utils';
import { In, Raw, Repository } from 'typeorm';
import { CreateSuitDto } from '../dto/create-suit.dto';
import { UpdateSuitDto } from '../dto/update-suit.dto';
import { Suit } from '../entity/suit.entity';

type GetFreeSuitsFilters = {
  date: string;
  id?: string;
};
@Injectable()
export class SuitService {
  constructor(
    @InjectRepository(Suit) private suitRepository: Repository<Suit>,
  ) {}
  getSuits() {
    return this.suitRepository.find({
      relations: {
        bookings: true,
      },
    });
  }

  async createSuit(suit: CreateSuitDto) {
    const suitFound = await this.suitRepository.findOne({
      where: { id: suit.id },
    });
    if (suitFound)
      throw new HttpException('Suit already exists', HttpStatus.CONFLICT);
    const newSuit = this.suitRepository.create(suit);
    return this.suitRepository.save(newSuit);
  }

  async getSuit(id: string) {
    const suitFound = await this.suitRepository.findOne({ where: { id } });
    if (!suitFound) {
      throw new HttpException('Suit not found', HttpStatus.NOT_FOUND);
    }
    return suitFound;
  }

  async deleteSuit(id: string) {
    const suitFound = await this.suitRepository.findOne({
      where: { id },
      relations: ['bookings'],
    });
    if (!suitFound) {
      throw new HttpException('Suit not found', HttpStatus.NOT_FOUND);
    }
    const active_bookings = suitFound.bookings.filter(
      (booking) =>
        booking.booking_state === 'ACTIVED' ||
        booking.booking_state === 'INPROGRESS',
    );
    if (active_bookings.length > 0) {
      throw new HttpException(
        'Suit has active bookings',
        HttpStatus.BAD_REQUEST,
      );
    }
    const res = await this.suitRepository.remove(suitFound);

    if (!res) {
      throw new HttpException(
        'Error deleting suit',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return {
      message: 'Suit Deleted successfully',
    };
  }
  async updateSuit(id: string, suit: UpdateSuitDto) {
    const suitFound = await this.suitRepository.findOne({ where: { id } });
    if (!suitFound) {
      throw new HttpException('Suit not found', HttpStatus.NOT_FOUND);
    }
    Object.assign(suitFound, suit);
    console.log(suitFound);

    try {
      return await this.suitRepository.save(suitFound);
    } catch {
      throw new HttpException('Error updating suit', HttpStatus.BAD_REQUEST);
    }
  }

  async getSuitToLoundry() {
    const suitsToLoundry = await this.suitRepository.find({
      where: {
        state: SuitState.ENLOCALSUCIO,
      },
    });
    if (suitsToLoundry.length > 0) {
      return suitsToLoundry;
    } else {
      return [];
    }
  }

  async getSuitToTakeLoundry() {
    const suitsToTakeLoundry = await this.suitRepository.find({
      where: {
        state: In([
          SuitState.LAVANDERIALUCECITALIMPIO,
          SuitState.LAVANDERIACELIALIMPIO,
        ]),
      },
      relations: {
        bookings: true,
      },
    });
    if (suitsToTakeLoundry.length > 0) {
      return suitsToTakeLoundry;
    } else {
      return [];
    }
  }
  async getSuitsInLoundry() {
    const suitsInLoundry = await this.suitRepository.find({
      where: {
        state: In([
          SuitState.LAVANDERIALUCECITASUCIO,
          SuitState.LAVANDERIACELIASUCIO,
        ]),
      },
      relations: {
        bookings: true,
      },
    });
    if (suitsInLoundry.length > 0) {
      return suitsInLoundry;
    } else {
      return [];
    }
  }
  async getFreeSuits(filters: GetFreeSuitsFilters) {
    const normalizedId = filters.id?.trim().toLowerCase();
    const suits = await this.suitRepository.find({
      where: normalizedId
        ? {
            id: Raw((alias) => `LOWER(${alias}) LIKE :id`, {
              id: `%${normalizedId}%`,
            }),
          }
        : {},
      relations: ['bookings'],
    });

    if (suits.length === 0) {
      return [];
    }

    if (!filters.date) {
      return suits;
    }

    const baseDate = this.parseBookingFilterDate(filters.date);
    const dateStart = subDays(baseDate, 1);
    const dateEnd = addDays(baseDate, 3);

    return suits.filter((suit: Suit) => {
      const activeBookings = suit.bookings.filter(
        (booking) =>
          booking.booking_state === 'ACTIVED' ||
          booking.booking_state === 'INPROGRESS',
      );

      const hasOverlappingBooking = activeBookings.some((booking) => {
        const bookingStart = parseStoredDateValue(booking.start_at, 'start_at');
        const bookingEnd = parseStoredDateValue(booking.end_at, 'end_at');

        return dateEnd >= bookingStart && dateStart <= bookingEnd;
      });

      return !hasOverlappingBooking;
    });
  }

  private parseBookingFilterDate(dateString: string): Date {
    const parsedDate = DateUtils.parseDateWithFormatsToUtcStart(dateString, [
      'yyyy-MM-dd',
      'dd-MM-yyyy',
    ]);

    if (!parsedDate) {
      throw new HttpException(
        'Invalid date format. Use yyyy-MM-dd or dd-MM-yyyy',
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsedDate;
  }
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
