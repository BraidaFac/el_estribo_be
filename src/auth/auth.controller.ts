import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserDto } from 'src/user/user.dto';
import { UserRole } from 'src/utils/user_utils';
import { UserService } from './../user/user.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { SignInDto } from './signIn.dto';
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.userName, signInDto.password);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('signup')
  signUp(@Body() userDto: UserDto) {
    return this.userService.createUser(userDto);
  }

  @Post('validate')
  validateToken(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }
}
