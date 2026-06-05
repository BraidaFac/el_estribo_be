import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm/dist';
import * as bcrypt from 'bcryptjs';
import { UserRole } from 'src/utils/user_utils';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './update-user.dto';
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
    const displayName =
      (process.env.CLIENT_ADMIN_NAME ?? 'Administrador').trim() ||
      'Administrador';

    const exists = await this.userRepository.exists({
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
      activo: true,
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
  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { activo: true },
      order: { name: 'ASC' },
    });
  }

  async createUser(user: UserDto): Promise<User> {
    const userFound = await this.userRepository.findOne({
      where: { userName: user.userName },
    });
    if (userFound) throw new HttpException('User already exists', 400);
    const newUser = this.userRepository.create({
      name: user.name,
      userName: user.userName,
      password: bcrypt.hashSync(user.password, 10),
      role: user.role ?? UserRole.USER,
      activo: true,
    });
    return this.userRepository.save(newUser);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.userName !== undefined) {
      const existing = await this.userRepository.findOne({
        where: { userName: dto.userName },
      });
      if (existing && String(existing.id) !== String(id)) {
        throw new HttpException('El nombre de usuario ya está en uso', 400);
      }
      user.userName = dto.userName;
    }
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) user.password = bcrypt.hashSync(dto.password, 10);

    return this.userRepository.save(user);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.activo = false;
    await this.userRepository.save(user);
  }
}
