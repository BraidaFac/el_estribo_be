import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateModistaDto } from '../dto/create-modista.dto';
import { UpdateModistaDto } from '../dto/update-modista.dto';
import { Modista } from '../entity/modista.entity';

@Injectable()
export class ModistasService {
  constructor(
    @InjectRepository(Modista)
    private readonly modistaRepository: Repository<Modista>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<Modista[]> {
    return this.modistaRepository.find({
      where: { activo: true },
      order: { predeterminada: 'DESC', nombre: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Modista> {
    const modista = await this.modistaRepository.findOne({
      where: { id, activo: true },
    });
    if (!modista) {
      throw new NotFoundException('Modista no encontrada');
    }
    return modista;
  }

  async crear(dto: CreateModistaDto): Promise<Modista> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Modista);
      const nueva = repo.create({
        nombre: dto.nombre.trim(),
        telefono: dto.telefono?.trim() ?? null,
        direccion: dto.direccion?.trim() ?? null,
        predeterminada: false,
        activo: true,
      });
      const guardada = await repo.save(nueva);
      if (dto.predeterminada) {
        await this.setPredeterminadaModistaWithManager(manager, guardada.id);
      }
      const final = await repo.findOne({
        where: { id: guardada.id, activo: true },
      });
      if (!final) {
        throw new NotFoundException('Modista no encontrada');
      }
      return final;
    });
  }

  async actualizar(id: number, dto: UpdateModistaDto): Promise<Modista> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Modista);
      const modista = await repo.findOne({ where: { id, activo: true } });
      if (!modista) {
        throw new NotFoundException('Modista no encontrada');
      }
      if (dto.nombre !== undefined) modista.nombre = dto.nombre.trim();
      if (dto.telefono !== undefined)
        modista.telefono = dto.telefono?.trim() ?? null;
      if (dto.direccion !== undefined)
        modista.direccion = dto.direccion?.trim() ?? null;
      if (dto.predeterminada === false) {
        modista.predeterminada = false;
      }
      await repo.save(modista);
      if (dto.predeterminada === true) {
        await this.setPredeterminadaModistaWithManager(manager, id);
      }
      const final = await repo.findOne({ where: { id, activo: true } });
      if (!final) {
        throw new NotFoundException('Modista no encontrada');
      }
      return final;
    });
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const modista = await this.obtener(id);
    modista.activo = false;
    modista.predeterminada = false;
    await this.modistaRepository.save(modista);
    return { message: 'Modista desactivada correctamente' };
  }

  async setPredeterminada(id: number): Promise<{ message: string }> {
    return await this.dataSource.transaction(async (manager) => {
      await this.setPredeterminadaModistaWithManager(manager, id);
      return { message: 'Modista predeterminada actualizada correctamente' };
    });
  }

  private async setPredeterminadaModistaWithManager(
    manager: EntityManager,
    id: number,
  ): Promise<void> {
    const repo = manager.getRepository(Modista);
    const modista = await repo.findOne({ where: { id, activo: true } });
    if (!modista) {
      throw new NotFoundException('Modista no encontrada');
    }

    await repo
      .createQueryBuilder()
      .update(Modista)
      .set({ predeterminada: false })
      .where('predeterminada = true')
      .execute();

    await repo
      .createQueryBuilder()
      .update(Modista)
      .set({ predeterminada: true })
      .where('id = :id', { id })
      .execute();
  }
}
