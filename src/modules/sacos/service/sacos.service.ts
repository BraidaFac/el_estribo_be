import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSacoDto } from '../dto/create-saco.dto';
import { UpdateSacoDto } from '../dto/update-saco.dto';
import { Saco } from '../entity/saco.entity';

@Injectable()
export class SacosService {
  constructor(
    @InjectRepository(Saco)
    private readonly sacoRepository: Repository<Saco>,
  ) {}

  async listar(): Promise<Saco[]> {
    return this.sacoRepository.find({
      where: { activo: true },
      order: { codigo: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Saco> {
    const saco = await this.sacoRepository.findOne({
      where: { id, activo: true },
    });
    if (!saco) {
      throw new NotFoundException('Saco no encontrado');
    }
    return saco;
  }

  async crear(dto: CreateSacoDto): Promise<Saco> {
    const nuevo = this.sacoRepository.create({
      codigo: dto.codigo.trim(),
      marca: dto.marca.trim(),
      talle: dto.talle?.trim() ?? null,
      color: dto.color?.trim() ?? null,
      condicion: dto.condicion,
      activo: true,
    });
    return this.sacoRepository.save(nuevo);
  }

  async actualizar(id: number, dto: UpdateSacoDto): Promise<Saco> {
    const saco = await this.obtener(id);
    if (dto.codigo !== undefined) saco.codigo = dto.codigo.trim();
    if (dto.marca !== undefined) saco.marca = dto.marca.trim();
    if (dto.talle !== undefined) saco.talle = dto.talle?.trim() ?? null;
    if (dto.color !== undefined) saco.color = dto.color?.trim() ?? null;
    if (dto.condicion !== undefined) saco.condicion = dto.condicion;
    return this.sacoRepository.save(saco);
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const saco = await this.obtener(id);
    saco.activo = false;
    await this.sacoRepository.save(saco);
    return { message: 'Saco desactivado correctamente' };
  }
}
