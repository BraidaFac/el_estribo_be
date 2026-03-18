import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/utils/user_utils';

export class UserDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  password: string;
  @IsOptional()
  role: UserRole;
}
