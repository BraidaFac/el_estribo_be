import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EstadoUbicacionPrenda,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import { EntityManager, Repository } from 'typeorm';
import { MovimientoPrenda } from '../entity/movimiento-prenda.entity';

@Injectable()
export class OperacionesPrendaService {
  constructor(
    @InjectRepository(MovimientoPrenda)
    private readonly movimientoRepository: Repository<MovimientoPrenda>,
  ) {}

  async actualizarUbicacion(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    ubicacionNueva: EstadoUbicacionPrenda,
    options?: {
      manager?: EntityManager;
      usuarioId?: string | null;
      motivo?: string | null;
      reservaId?: number | null;
      tareaOperativaId?: number | null;
    },
  ): Promise<void> {
    const manager = options?.manager;
    const repoSaco = manager ? manager.getRepository(Saco) : null;
    const repoPantalon = manager ? manager.getRepository(Pantalon) : null;
    const repoMovimientos = manager
      ? manager.getRepository(MovimientoPrenda)
      : this.movimientoRepository;
    const repoReserva = manager ? manager.getRepository(Reserva) : null;

    if (tipoPrenda === TipoPrenda.SACO) {
      const saco = await (repoSaco ?? this.getFallbackSacoRepo()).findOne({
        where: { id: prendaId },
      });
      if (!saco) throw new NotFoundException('Saco no encontrado');

      const estadoAnterior = saco.ubicacionActual ?? null;
      if (estadoAnterior === ubicacionNueva) return;

      saco.ubicacionActual = ubicacionNueva;
      await (repoSaco ?? this.getFallbackSacoRepo()).save(saco);

      const reserva = options?.reservaId
        ? await (repoReserva ?? this.getFallbackReservaRepo()).findOne({
            where: { id: options.reservaId },
          })
        : null;

      await repoMovimientos.save(
        repoMovimientos.create({
          tipoPrenda,
          saco,
          pantalon: null,
          reserva,
          estadoAnterior,
          estadoNuevo: ubicacionNueva,
          motivo: options?.motivo ?? null,
          usuarioId: options?.usuarioId ?? null,
          tareaOperativaId: options?.tareaOperativaId ?? null,
        }),
      );
      return;
    }

    const pantalon = await (
      repoPantalon ?? this.getFallbackPantalonRepo()
    ).findOne({
      where: { id: prendaId },
    });
    if (!pantalon) throw new NotFoundException('Pantalon no encontrado');

    const estadoAnterior = pantalon.ubicacionActual ?? null;
    if (estadoAnterior === ubicacionNueva) return;

    pantalon.ubicacionActual = ubicacionNueva;
    await (repoPantalon ?? this.getFallbackPantalonRepo()).save(pantalon);

    const reserva = options?.reservaId
      ? await (repoReserva ?? this.getFallbackReservaRepo()).findOne({
          where: { id: options.reservaId },
        })
      : null;

    await repoMovimientos.save(
      repoMovimientos.create({
        tipoPrenda,
        saco: null,
        pantalon,
        reserva,
        estadoAnterior,
        estadoNuevo: ubicacionNueva,
        motivo: options?.motivo ?? null,
        usuarioId: options?.usuarioId ?? null,
        tareaOperativaId: options?.tareaOperativaId ?? null,
      }),
    );
  }

  private getFallbackSacoRepo(): Repository<Saco> {
    return this.movimientoRepository.manager.getRepository(Saco);
  }

  private getFallbackPantalonRepo(): Repository<Pantalon> {
    return this.movimientoRepository.manager.getRepository(Pantalon);
  }

  private getFallbackReservaRepo(): Repository<Reserva> {
    return this.movimientoRepository.manager.getRepository(Reserva);
  }
}
