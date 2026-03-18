import { Booking } from 'src/booking/entity/booking.entity';
import { SuitCategory, SuitState } from 'src/utils/suit_utils';
import { Column, Entity, OneToMany } from 'typeorm';
@Entity()
export class Suit {
  @Column({ unique: true, primary: true })
  id: string;
  @Column()
  brand: string;
  @Column()
  category: SuitCategory;
  @Column({ default: SuitState.ENLOCALLMPIO })
  state: SuitState;
  @Column({ nullable: true })
  size: Size;
  @OneToMany(() => Booking, (booking) => booking.suit, { cascade: true })
  bookings: Booking[];
  @Column()
  color: string;
}
export type Size =
  | 38
  | 40
  | 42
  | 44
  | 46
  | 48
  | 50
  | 52
  | 54
  | 56
  | 58
  | 60
  | 62
  | 64
  | 66
  | 68
  | 70;
