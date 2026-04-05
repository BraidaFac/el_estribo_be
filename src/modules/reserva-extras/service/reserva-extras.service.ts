import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Accesorio } from 'src/modules/accesorios/entity/accesorio.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { DataSource, Repository } from 'typeorm';
import { PatchDevolucionExtrasDto } from '../dto/patch-devolucion-extras.dto';
import { SetReservaExtrasDto } from '../dto/set-reserva-extras.dto';
import { ReservaExtra } from '../entity/reserva-extra.entity';

@Injectable()
export class ReservaExtrasService {
  constructor(
    @InjectRepository(ReservaExtra)
    private readonly extraRepository: Repository<ReservaExtra>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Accesorio)
    private readonly accesorioRepository: Repository<Accesorio>,
    private readonly dataSource: DataSource,
  ) {}

  async findByReserva(reservaId: number): Promise<ReservaExtra[]> {
    return this.extraRepository.find({
      where: { reserva: { id: reservaId } },
      order: { id: 'ASC' },
    });
  }

  async setExtras(reservaId: number, dto: SetReservaExtrasDto): Promise<ReservaExtra[]> {
    const reserva = await this.reservaRepository.findOne({ where: { id: reservaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ReservaExtra, { reserva: { id: reservaId } });

      if (dto.extras.length > 0) {
        const accesorioIds = dto.extras.map((e) => e.accesorioId);
        const accesorios = await manager.findByIds(Accesorio, accesorioIds);
        const accesorioMap = new Map(accesorios.map((a) => [a.id, a]));

        const newExtras = dto.extras.map((item) => {
          const accesorio = accesorioMap.get(item.accesorioId);
          if (!accesorio) throw new NotFoundException(`Accesorio ${item.accesorioId} no encontrado`);
          return manager.create(ReservaExtra, {
            reserva,
            accesorio,
            observacion: item.observacion ?? null,
          });
        });

        await manager.save(ReservaExtra, newExtras);
      }
    });

    return this.findByReserva(reservaId);
  }

  async patchDevolucion(reservaId: number, dto: PatchDevolucionExtrasDto): Promise<ReservaExtra[]> {
    const extras = await this.findByReserva(reservaId);
    const extraMap = new Map(extras.map((e) => [e.id, e]));

    for (const item of dto.extras) {
      const extra = extraMap.get(item.extraId);
      if (!extra) throw new NotFoundException(`Extra ${item.extraId} no encontrado en esta reserva`);
      extra.devuelto = item.devuelto;
      extra.observacionDevolucion = item.observacionDevolucion ?? null;
      await this.extraRepository.save(extra);
    }

    return this.findByReserva(reservaId);
  }
}
