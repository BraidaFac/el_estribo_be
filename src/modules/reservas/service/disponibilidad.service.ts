import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EstadoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { EntityManager, Repository } from 'typeorm';
import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';

export type RangoConsulta = {
  inicio: string;
  fin: string;
};

@Injectable()
export class DisponibilidadService {
  constructor(
    @InjectRepository(BloqueoPrenda)
    private readonly bloqueoRepository: Repository<BloqueoPrenda>,
  ) {}

  async existeSolapamiento(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    inicio: string,
    fin: string,
    reservaIgnorarId?: number,
  ): Promise<boolean> {
    return this.existeSolapamientoEnRangos(
      tipoPrenda,
      prendaId,
      [{ inicio, fin }],
      { reservaIgnorarId },
    );
  }

  async existeSolapamientoEnRangos(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    rangos: RangoConsulta[],
    options?: {
      reservaIgnorarId?: number;
      manager?: EntityManager;
      lockForUpdate?: boolean;
    },
  ): Promise<boolean> {
    if (rangos.length === 0) {
      return false;
    }

    const repo = options?.manager
      ? options.manager.getRepository(BloqueoPrenda)
      : this.bloqueoRepository;

    const qb = repo
      .createQueryBuilder('b')
      .where('b.estado = :estado', { estado: EstadoBloqueo.ACTIVO })
      .andWhere(
        `(${rangos
          .map(
            (_rango, index) =>
              `NOT (b.fin < :inicio${index} OR b.inicio > :fin${index})`,
          )
          .join(' OR ')})`,
      );

    rangos.forEach((rango, index) => {
      qb.setParameter(`inicio${index}`, rango.inicio);
      qb.setParameter(`fin${index}`, rango.fin);
    });

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('b.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('b.pantalon_id = :prendaId', { prendaId });
    }

    if (options?.reservaIgnorarId) {
      qb.andWhere(
        '(b.reserva_id IS NULL OR b.reserva_id <> :reservaIgnorarId)',
        {
          reservaIgnorarId: options.reservaIgnorarId,
        },
      );
    }

    if (options?.lockForUpdate && options.manager) {
      qb.setLock('pessimistic_write');
      const conflictRow = await qb.select('b.id', 'id').limit(1).getRawOne();
      return Boolean(conflictRow?.id);
    }

    return (await qb.getCount()) > 0;
  }

  async obtenerBloqueosActivos(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    inicio: string,
    fin: string,
  ): Promise<BloqueoPrenda[]> {
    const qb = this.bloqueoRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.modista', 'modista')
      .leftJoinAndSelect('b.lavanderia', 'lavanderia')
      .where('b.estado = :estado', { estado: EstadoBloqueo.ACTIVO })
      .andWhere('NOT (b.fin < :inicio OR b.inicio > :fin)', { inicio, fin })
      .orderBy('b.inicio', 'ASC');

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('b.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('b.pantalon_id = :prendaId', { prendaId });
    }

    return qb.getMany();
  }
}
