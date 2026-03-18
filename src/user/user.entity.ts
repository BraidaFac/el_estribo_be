import { UserRole } from 'src/utils/user_utils';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;
  @Column()
  name: string;
  @Column({ unique: true })
  userName: string;
  @Column()
  password: string;
  @Column({ default: UserRole.USER })
  role: UserRole;
}
