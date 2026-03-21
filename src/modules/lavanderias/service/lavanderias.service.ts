import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateLavanderiaDto } from '../dto/create-lavanderia.dto';
import { UpdateLavanderiaDto } from '../dto/update-lavanderia.dto';
import { Lavanderia } from '../entity/lavanderia.entity';

@Injectable()
export class LavanderiasService {
  constructor(
    @InjectRepository(Lavanderia)
    private readonly lavanderiaRepository: Repository<Lavanderia>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<Lavanderia[]> {
    return this.lavanderiaRepository.find({
      where: { activo: true },
      order: { predeterminada: 'DESC', nombre: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Lavanderia> {
    const lavanderia = await this.lavanderiaRepository.findOne({
      where: { id, activo: true },
    });
    if (!lavanderia) {
      throw new NotFoundException('Lavanderia no encontrada');
    }
    return lavanderia;
  }

  async crear(dto: CreateLavanderiaDto): Promise<Lavanderia> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Lavanderia);
      const nueva = repo.create({
        nombre: dto.nombre.trim(),
        telefono: dto.telefono?.trim() ?? null,
        direccion: dto.direccion?.trim() ?? null,
        predeterminada: false,
        activo: true,
      });
      const guardada = await repo.save(nueva);
      if (dto.predeterminada) {
        await this.setPredeterminadaLavanderiaWithManager(manager, guardada.id);
      }
      const final = await repo.findOne({
        where: { id: guardada.id, activo: true },
      });
      if (!final) {
        throw new NotFoundException('Lavanderia no encontrada');
      }
      return final;
    });
  }

  async actualizar(id: number, dto: UpdateLavanderiaDto): Promise<Lavanderia> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Lavanderia);
      const lavanderia = await repo.findOne({ where: { id, activo: true } });
      if (!lavanderia) {
        throw new NotFoundException('Lavanderia no encontrada');
      }
      if (dto.nombre !== undefined) lavanderia.nombre = dto.nombre.trim();
      if (dto.telefono !== undefined)
        lavanderia.telefono = dto.telefono?.trim() ?? null;
      if (dto.direccion !== undefined)
        lavanderia.direccion = dto.direccion?.trim() ?? null;
      if (dto.predeterminada === false) {
        lavanderia.predeterminada = false;
      }
      await repo.save(lavanderia);
      if (dto.predeterminada === true) {
        await this.setPredeterminadaLavanderiaWithManager(manager, id);
      }
      const final = await repo.findOne({ where: { id, activo: true } });
      if (!final) {
        throw new NotFoundException('Lavanderia no encontrada');
      }
      return final;
    });
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const lavanderia = await this.obtener(id);
    lavanderia.activo = false;
    lavanderia.predeterminada = false;
    await this.lavanderiaRepository.save(lavanderia);
    return { message: 'Lavanderia desactivada correctamente' };
  }

  async setPredeterminada(id: number): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      await this.setPredeterminadaLavanderiaWithManager(manager, id);
      return { message: 'Lavanderia predeterminada actualizada correctamente' };
    });
  }

  /**
   * Una sola predeterminada activa: desactiva el flag en todas y activa la indicada.
   * Debe ejecutarse dentro de la transacción del alta/edición para evitar dos `true` simultáneos.
   */
  private async setPredeterminadaLavanderiaWithManager(
    manager: EntityManager,
    id: number,
  ): Promise<void> {
    const repo = manager.getRepository(Lavanderia);
    const lavanderia = await repo.findOne({ where: { id, activo: true } });
    if (!lavanderia) {
      throw new NotFoundException('Lavanderia no encontrada');
    }

    await repo
      .createQueryBuilder()
      .update(Lavanderia)
      .set({ predeterminada: false })
      .where('predeterminada = true')
      .execute();

    await repo
      .createQueryBuilder()
      .update(Lavanderia)
      .set({ predeterminada: true })
      .where('id = :id', { id })
      .execute();
  }
}
