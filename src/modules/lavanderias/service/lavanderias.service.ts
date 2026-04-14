import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateLavanderiaDto } from '../dto/create-lavanderia.dto';
import {
  CreatePrecioHistoricoDto,
  UpdatePrecioHistoricoDto,
} from '../dto/precio-historico.dto';
import { UpdateLavanderiaDto } from '../dto/update-lavanderia.dto';
import { Lavanderia } from '../entity/lavanderia.entity';
import { PrecioHistoricoLavanderia } from '../entity/precio-historico-lavanderia.entity';

export type LavanderiaConPrecio = Lavanderia & { precioActual: number | null };

function getPrecioVigente(
  precios: PrecioHistoricoLavanderia[],
  fecha: Date,
): number | null {
  const isoFecha = fecha.toISOString().slice(0, 10);
  const vigentes = precios
    .filter((p) => p.vigenciaDesde <= isoFecha)
    .sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde));
  return vigentes.length > 0 ? vigentes[0].precio : null;
}

@Injectable()
export class LavanderiasService {
  constructor(
    @InjectRepository(Lavanderia)
    private readonly lavanderiaRepository: Repository<Lavanderia>,
    @InjectRepository(PrecioHistoricoLavanderia)
    private readonly precioRepository: Repository<PrecioHistoricoLavanderia>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<LavanderiaConPrecio[]> {
    const lavanderias = await this.lavanderiaRepository.find({
      where: { activo: true },
      relations: ['precios'],
      order: { predeterminada: 'DESC', nombre: 'ASC' },
    });
    const hoy = new Date();
    return lavanderias.map((l) => ({
      ...l,
      precioActual: getPrecioVigente(l.precios ?? [], hoy),
    }));
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

  // ── Precios históricos ──────────────────────────────────────────────────────

  async listarPrecios(
    lavanderiaId: number,
  ): Promise<PrecioHistoricoLavanderia[]> {
    await this.obtener(lavanderiaId);
    return this.precioRepository.find({
      where: { lavanderia: { id: lavanderiaId } },
      order: { vigenciaDesde: 'DESC' },
    });
  }

  async agregarPrecio(
    lavanderiaId: number,
    dto: CreatePrecioHistoricoDto,
  ): Promise<PrecioHistoricoLavanderia> {
    const hoy = new Date().toISOString().slice(0, 10);
    if (dto.vigenciaDesde > hoy) {
      throw new BadRequestException(
        'vigenciaDesde no puede ser una fecha futura',
      );
    }
    const lavanderia = await this.obtener(lavanderiaId);
    const precio = this.precioRepository.create({
      lavanderia,
      precio: dto.precio,
      vigenciaDesde: dto.vigenciaDesde,
    });
    return this.precioRepository.save(precio);
  }

  async actualizarPrecio(
    precioId: number,
    dto: UpdatePrecioHistoricoDto,
  ): Promise<PrecioHistoricoLavanderia> {
    const precio = await this.precioRepository.findOne({
      where: { id: precioId },
    });
    if (!precio) {
      throw new NotFoundException('Precio no encontrado');
    }
    if (dto.vigenciaDesde !== undefined) {
      const hoy = new Date().toISOString().slice(0, 10);
      if (dto.vigenciaDesde > hoy) {
        throw new BadRequestException(
          'vigenciaDesde no puede ser una fecha futura',
        );
      }
      precio.vigenciaDesde = dto.vigenciaDesde;
    }
    if (dto.precio !== undefined) {
      precio.precio = dto.precio;
    }
    return this.precioRepository.save(precio);
  }

  async eliminarPrecio(precioId: number): Promise<{ message: string }> {
    const precio = await this.precioRepository.findOne({
      where: { id: precioId },
    });
    if (!precio) {
      throw new NotFoundException('Precio no encontrado');
    }
    await this.precioRepository.remove(precio);
    return { message: 'Precio eliminado correctamente' };
  }

  // ── Privado ─────────────────────────────────────────────────────────────────

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
