import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserService } from './user.service';

/**
 * Crea un usuario ADMIN al arrancar si PASSWORD_CLIENT está definido y aún no existe
 * el usuario indicado (por defecto userName `admin`). Idempotente.
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly userService: UserService) {}

  onModuleInit(): void {
    void this.userService.ensureBootstrapAdminUser().catch((err) => {
      this.logger.error(
        `Bootstrap admin: error inesperado: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }
}
