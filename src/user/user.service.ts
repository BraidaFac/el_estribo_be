import { HttpException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist';
import * as bcrypt from 'bcryptjs';
import { UserRole } from 'src/utils/user_utils';
import { Repository } from 'typeorm';
import { UserDto } from './user.dto';
import { User } from './user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  /**
   * Si PASSWORD_CLIENT está definido y no existe aún un usuario con ese userName
   * (CLIENT_USERNAME o `admin` por defecto), crea un ADMIN. Idempotente.
   */
  async ensureBootstrapAdminUser(): Promise<void> {
    const rawPassword = process.env.PASSWORD_CLIENT;
    if (!rawPassword?.trim()) {
      this.logger.log(
        'Bootstrap admin: PASSWORD_CLIENT no definido; no se crea usuario inicial.',
      );
      return;
    }

    const userName = (process.env.CLIENT_USERNAME ?? 'admin').trim() || 'admin';
    const displayName = (process.env.CLIENT_ADMIN_NAME ?? 'Administrador').trim() || 'Administrador';

    const exists = await this.userRepository.exist({
      where: { userName },
    });
    if (exists) {
      this.logger.log(
        `Bootstrap admin: el usuario "${userName}" ya existe; no se modifica.`,
      );
      return;
    }

    const passwordHash = bcrypt.hashSync(rawPassword.trim(), 10);
    const user = this.userRepository.create({
      name: displayName,
      userName,
      password: passwordHash,
      role: UserRole.ADMIN,
    });
    await this.userRepository.save(user);
    this.logger.log(
      `Bootstrap admin: creado usuario "${userName}" con rol ADMIN.`,
    );
  }

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
      newUser.role = UserRole.ADMIN;
      newUser.password = bcrypt.hashSync(user.password, 10);
      return this.userRepository.save(newUser);
    } catch {
      if (userFound) throw new HttpException('Server error', 500);
    }
  }
}
