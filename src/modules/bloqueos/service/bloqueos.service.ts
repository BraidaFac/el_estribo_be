import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  EstadoBloqueo,
  EstadoReserva,
  TipoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BloqueoPrenda } from '../entity/bloqueo-prenda.entity';
import { BloqueoPrendaEvento } from '../entity/bloqueo-prenda-evento.entity';

@Injectable()
export class BloqueosService {
  constructor(
    @InjectRepository(BloqueoPrenda)
    private readonly bloqueoRepository: Repository<BloqueoPrenda>,
    @InjectRepository(BloqueoPrendaEvento)
    private readonly eventoRepository: Repository<BloqueoPrendaEvento>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listarPorPrenda(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    desde: string,
    hasta: string,
  ): Promise<BloqueoPrenda[]> {
    const qb = this.bloqueoRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.reserva', 'reserva')
      .leftJoinAndSelect('reserva.pantalon', 'reservaPantalon')
      .leftJoinAndSelect('b.modista', 'modista')
      .leftJoinAndSelect('b.lavanderia', 'lavanderia')
      .where('NOT (b.fin < :desde OR b.inicio > :hasta)', { desde, hasta })
      .orderBy('b.inicio', 'ASC');

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('b.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('b.pantalon_id = :prendaId', { prendaId });
    }

    return qb.getMany();
  }

  async cancelarManual(
    bloqueoId: number,
    usuarioId: string,
    motivoCancelacion: string,
  ): Promise<BloqueoPrenda> {
    const bloqueo = await this.bloqueoRepository.findOne({
      where: { id: bloqueoId },
      relations: ['reserva'],
    });

    if (!bloqueo) {
      throw new NotFoundException('Bloqueo no encontrado');
    }
    if (!bloqueo.cancelableManual) {
      throw new BadRequestException(
        'Este bloqueo no admite cancelacion manual',
      );
    }
    if (bloqueo.estado === EstadoBloqueo.CANCELADO) {
      throw new BadRequestException('El bloqueo ya se encuentra cancelado');
    }

    if (bloqueo.reserva) {
      const estado = bloqueo.reserva.estadoReserva;
      if (
        estado === EstadoReserva.COMPLETADA ||
        estado === EstadoReserva.CANCELADA
      ) {
        throw new BadRequestException(
          'No se puede cancelar bloqueos de una reserva ya completada o cancelada',
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      bloqueo.estado = EstadoBloqueo.CANCELADO;
      bloqueo.canceladoPor = usuarioId;
      bloqueo.canceladoAt = new Date();
      bloqueo.motivoCancelacion = motivoCancelacion;
      await manager.getRepository(BloqueoPrenda).save(bloqueo);

      const evento = this.eventoRepository.create({
        bloqueo,
        evento: 'CANCELADO_MANUAL',
        usuarioId,
        payloadJson: { motivoCancelacion },
      });
      await manager.getRepository(BloqueoPrendaEvento).save(evento);
    });

    return bloqueo;
  }

  /**
   * Cancela bloqueos LAVANDERIA activos y cancelables para una prenda concreta de una reserva.
 * Usado cuando la prenda no se envía a lavandería.
   */
  async cancelarBloquesLavanderiaActivosPorReservaYPrenda(
    reservaId: number,
    tipoPrenda: TipoPrenda,
    prendaId: number,
    usuarioId: string | null,
    motivo: string,
    manager?: EntityManager,
  ): Promise<void> {
    const bloqueoRepo = manager
      ? manager.getRepository(BloqueoPrenda)
      : this.bloqueoRepository;
    const eventoRepo = manager
      ? manager.getRepository(BloqueoPrendaEvento)
      : this.eventoRepository;

    const qb = bloqueoRepo
      .createQueryBuilder('b')
      .where('b.reserva_id = :reservaId', { reservaId })
      .andWhere('b.tipo_bloqueo = :tb', { tb: TipoBloqueo.LAVANDERIA })
      .andWhere('b.estado = :est', { est: EstadoBloqueo.ACTIVO })
      .andWhere('b.cancelable_manual = :cm', { cm: true });

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('b.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('b.pantalon_id = :prendaId', { prendaId });
    }

    const bloqueos = await qb.getMany();
    for (const bloqueo of bloqueos) {
      bloqueo.estado = EstadoBloqueo.CANCELADO;
      bloqueo.canceladoPor = usuarioId ?? null;
      bloqueo.canceladoAt = new Date();
      bloqueo.motivoCancelacion = motivo;
      await bloqueoRepo.save(bloqueo);
      await eventoRepo.save(
        eventoRepo.create({
          bloqueo,
          evento: 'CANCELADO_MANUAL',
          usuarioId: usuarioId ?? undefined,
          payloadJson: { motivoCancelacion: motivo, origen: 'omitir_lavanderia' },
        }),
      );
    }
  }

  /**
   * Cancela bloqueos MODISTA activos y cancelables para una prenda concreta de una reserva.
   */
  async cancelarBloquesModistaActivosPorReservaYPrenda(
    reservaId: number,
    tipoPrenda: TipoPrenda,
    prendaId: number,
    usuarioId: string | null,
    motivo: string,
    manager?: EntityManager,
  ): Promise<void> {
    const bloqueoRepo = manager
      ? manager.getRepository(BloqueoPrenda)
      : this.bloqueoRepository;
    const eventoRepo = manager
      ? manager.getRepository(BloqueoPrendaEvento)
      : this.eventoRepository;

    const qb = bloqueoRepo
      .createQueryBuilder('b')
      .where('b.reserva_id = :reservaId', { reservaId })
      .andWhere('b.tipo_bloqueo = :tb', { tb: TipoBloqueo.MODISTA })
      .andWhere('b.estado = :est', { est: EstadoBloqueo.ACTIVO })
      .andWhere('b.cancelable_manual = :cm', { cm: true });

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('b.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('b.pantalon_id = :prendaId', { prendaId });
    }

    const bloqueos = await qb.getMany();
    for (const bloqueo of bloqueos) {
      bloqueo.estado = EstadoBloqueo.CANCELADO;
      bloqueo.canceladoPor = usuarioId ?? null;
      bloqueo.canceladoAt = new Date();
      bloqueo.motivoCancelacion = motivo;
      await bloqueoRepo.save(bloqueo);
      await eventoRepo.save(
        eventoRepo.create({
          bloqueo,
          evento: 'CANCELADO_MANUAL',
          usuarioId: usuarioId ?? undefined,
          payloadJson: { motivoCancelacion: motivo, origen: 'omitir_modista' },
        }),
      );
    }
  }
}
