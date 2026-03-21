import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePantalonDto } from '../dto/create-pantalon.dto';
import { UpdatePantalonDto } from '../dto/update-pantalon.dto';
import { Pantalon } from '../entity/pantalon.entity';

@Injectable()
export class PantalonesService {
  constructor(
    @InjectRepository(Pantalon)
    private readonly pantalonRepository: Repository<Pantalon>,
  ) {}

  async listar(): Promise<Pantalon[]> {
    return this.pantalonRepository.find({
      where: { activo: true },
      order: { codigo: 'ASC' },
    });
  }

  async obtener(id: number): Promise<Pantalon> {
    const pantalon = await this.pantalonRepository.findOne({
      where: { id, activo: true },
    });
    if (!pantalon) {
      throw new NotFoundException('Pantalon no encontrado');
    }
    return pantalon;
  }

  async crear(dto: CreatePantalonDto): Promise<Pantalon> {
    const nuevo = this.pantalonRepository.create({
      codigo: dto.codigo.trim(),
      marca: dto.marca.trim(),
      talle: dto.talle?.trim() ?? null,
      color: dto.color?.trim() ?? null,
      condicion: dto.condicion,
      activo: true,
    });
    return this.pantalonRepository.save(nuevo);
  }

  async actualizar(id: number, dto: UpdatePantalonDto): Promise<Pantalon> {
    const pantalon = await this.obtener(id);
    if (dto.codigo !== undefined) pantalon.codigo = dto.codigo.trim();
    if (dto.marca !== undefined) pantalon.marca = dto.marca.trim();
    if (dto.talle !== undefined) pantalon.talle = dto.talle?.trim() ?? null;
    if (dto.color !== undefined) pantalon.color = dto.color?.trim() ?? null;
    if (dto.condicion !== undefined) pantalon.condicion = dto.condicion;
    return this.pantalonRepository.save(pantalon);
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const pantalon = await this.obtener(id);
    pantalon.activo = false;
    await this.pantalonRepository.save(pantalon);
    return { message: 'Pantalon desactivado correctamente' };
  }
}
