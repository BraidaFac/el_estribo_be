import { IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
  @IsString()
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  password: string;
}
