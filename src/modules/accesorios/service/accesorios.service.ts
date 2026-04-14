import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAccesorioDto } from '../dto/create-accesorio.dto';
import { UpdateAccesorioDto } from '../dto/update-accesorio.dto';
import { Accesorio } from '../entity/accesorio.entity';

@Injectable()
export class AccesoriosService {
  constructor(
    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
  ) {}

  findAll(): Promise<Accesorio[]> {
    return this.accesorioRepository.find({ order: { nombre: 'ASC' } });
  }

  async create(dto: CreateAccesorioDto): Promise<Accesorio> {
    const accesorio = this.accesorioRepository.create(dto);
    return this.accesorioRepository.save(accesorio);
  }

  async update(id: number, dto: UpdateAccesorioDto): Promise<Accesorio> {
    const accesorio = await this.accesorioRepository.findOne({ where: { id } });
    if (!accesorio) throw new NotFoundException('Accesorio no encontrado');
    if (dto.nombre !== undefined) accesorio.nombre = dto.nombre;
    if (dto.icono !== undefined) accesorio.icono = dto.icono;
    return this.accesorioRepository.save(accesorio);
  }

  async remove(id: number): Promise<void> {
    const accesorio = await this.accesorioRepository.findOne({ where: { id } });
    if (!accesorio) throw new NotFoundException('Accesorio no encontrado');
    await this.accesorioRepository.remove(accesorio);
  }
}
