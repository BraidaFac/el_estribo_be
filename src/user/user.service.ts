import { HttpException, Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm/dist';
import { Repository } from 'typeorm';
import { UserDto } from './user.dto';
import * as bycrpt from 'bcryptjs';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { userName: username },
    });
  }
  async createUser(user: UserDto) {
    const userFound = await this.userRepository.findOne({
      where: { userName: user.userName },
    });
    if (userFound) throw new HttpException('User already exists', 400);
    try {
      const newUser = this.userRepository.create(user);
      newUser.password = bycrpt.hashSync(user.password, 10);
      return this.userRepository.save(newUser);
    } catch {
      if (userFound) throw new HttpException('Server error', 500);
    }
  }
}
