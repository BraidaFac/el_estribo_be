import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bycrpt from 'bcryptjs';
import { User } from 'src/user/user.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    username: string,
    pass: string,
  ): Promise<{ access_token: string; user: Partial<User> }> {
    const user = await this.userService.findOne(username);
    if (!user) {
      throw new UnauthorizedException();
    }
    const { password, ...restData } = user;
    const password_result = bycrpt.compareSync(pass, password);

    if (!password_result) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.id, username: user.userName, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: restData,
    };
  }
  async validateToken(token: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      return decoded;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
