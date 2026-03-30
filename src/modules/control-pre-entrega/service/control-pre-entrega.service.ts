import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import {
  EstadoControlPreEntrega,
  EstadoReserva,
  EstadoUbicacionPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { TareasOperativasService } from 'src/modules/tareas-operativas/service/tareas-operativas.service';
import { DateUtils } from 'src/utils/date_utils';
import { Brackets, DataSource, Repository } from 'typeorm';
import { CreateControlPreEntregaDto } from '../dto/create-control-pre-entrega.dto';
import { ResolverRechazoPreEntregaDto } from '../dto/resolver-rechazo-pre-entrega.dto';
import { ControlPreEntrega } from '../entity/control-pre-entrega.entity';

export type PlanillaPrepararFilaDto = {
  reservaId: number;
  fechaReserva: string;
  clienteNombre: string;
  diasHastaReserva: number;
  tieneTareasPendientes: boolean;
  puedeIniciarPreEntrega: boolean;
};

export type RechazoPreEntregaDto = {
  id: number;
  reservaId: number;
  fechaReserva: string;
  clienteNombre: string;
  motivoRechazo: string | null;
  auditorNombre: string;
  estado: EstadoControlPreEntrega;
  createdAt: string;
};

@Injectable()
export class ControlPreEntregaService {
  constructor(
    @InjectRepository(ControlPreEntrega)
    private readonly controlRepository: Repository<ControlPreEntrega>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  async obtenerPorReservaId(
    reservaId: number,
  ): Promise<ControlPreEntrega | null> {
    return this.controlRepository.findOne({
      where: { reserva: { id: reservaId } },
    });
  }

  /**
   * Motivo para `accionesPermitidas.retirar` o null si el control deja retirar.
   */
  async motivoRetiroBloqueadoPorControl(
    reservaId: number,
  ): Promise<string | null> {
    const row = await this.controlRepository.findOne({
      where: { reserva: { id: reservaId } },
    });
    if (!row) {
      return 'Falta control de calidad pre-entrega aprobado';
    }
    if (row.estado === EstadoControlPreEntrega.RECHAZADO) {
      return 'Control pre-entrega rechazado: no se puede retirar hasta resolver';
    }
    if (
      row.estado !== EstadoControlPreEntrega.APROBADO &&
      row.estado !== EstadoControlPreEntrega.RESUELTO
    ) {
      return 'Estado de control pre-entrega invalido';
    }
    return null;
  }

  async assertControlPermiteRetiro(reservaId: number): Promise<void> {
    const m = await this.motivoRetiroBloqueadoPorControl(reservaId);
    if (m) {
      throw new BadRequestException(m);
    }
  }

  async planillaPreparar(): Promise<PlanillaPrepararFilaDto[]> {
    const hoy = DateUtils.getTodayDateOnly();
    const hasta = DateUtils.formatDateOnly(addDays(parseISO(`${hoy}T00:00:00`), 10));

    const qb = this.reservaRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.saco', 'saco')
      .leftJoinAndSelect('r.pantalon', 'pantalon')
      .leftJoin(
        ControlPreEntrega,
        'cpe',
        'cpe.reserva_id = r.id',
      )
      .where('r.estadoReserva = :est', { est: EstadoReserva.CONFIRMADA })
      .andWhere('r.fechaReserva BETWEEN :desde AND :hasta', {
        desde: hoy,
        hasta,
      })
      .andWhere('saco.ubicacionActual = :tienda', {
        tienda: EstadoUbicacionPrenda.TIENDA,
      })
      .andWhere(
        new Brackets((w) => {
          w.where('r.pantalon IS NULL').orWhere(
            'pantalon.ubicacionActual = :tienda',
            { tienda: EstadoUbicacionPrenda.TIENDA },
          );
        }),
      )
      .andWhere('cpe.id IS NULL')
      .orderBy('r.fechaReserva', 'ASC')
      .addOrderBy('r.id', 'ASC');

    const reservas = await qb.getMany();
    const ids = reservas.map((r) => r.id);
    const conTareas = await this.tareasOperativasService.reservasIdsConTareasOperativasAbiertas(
      ids,
    );

    return reservas.map((r) => {
      const diasHastaReserva = differenceInCalendarDays(
        parseISO(`${r.fechaReserva}T00:00:00`),
        parseISO(`${hoy}T00:00:00`),
      );
      const tieneTareasPendientes = conTareas.has(r.id);
      const puedeIniciarPreEntrega = !tieneTareasPendientes;
      return {
        reservaId: r.id,
        fechaReserva: r.fechaReserva,
        clienteNombre: r.clienteNombre,
        diasHastaReserva,
        tieneTareasPendientes,
        puedeIniciarPreEntrega,
      };
    });
  }

  async crear(dto: CreateControlPreEntregaDto): Promise<ControlPreEntrega> {
    if (dto.estado === EstadoControlPreEntrega.RESUELTO) {
      throw new BadRequestException(
        'El resultado inicial no puede ser RESUELTO (use la planilla de rechazados)',
      );
    }
    if (dto.estado === EstadoControlPreEntrega.RECHAZADO) {
      if (!dto.motivoRechazo?.trim()) {
        throw new BadRequestException(
          'Motivo de rechazo obligatorio cuando el resultado es RECHAZADO',
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const reserva = await manager.getRepository(Reserva).findOne({
        where: { id: dto.reservaId },
        relations: ['saco', 'pantalon'],
      });
      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reserva.estadoReserva !== EstadoReserva.CONFIRMADA) {
        throw new BadRequestException(
          'Solo se puede registrar control pre-entrega en reservas confirmadas sin aprobación previa',
        );
      }
      if (!this.prendasEnTienda(reserva)) {
        throw new BadRequestException(
          'Las prendas deben estar en tienda para el control pre-entrega',
        );
      }

      const existente = await manager.getRepository(ControlPreEntrega).findOne({
        where: { reserva: { id: reserva.id } },
      });
      if (existente) {
        throw new BadRequestException(
          'Ya existe un registro de control pre-entrega para esta reserva',
        );
      }

      const conTareas =
        await this.tareasOperativasService.reservasIdsConTareasOperativasAbiertas(
          [reserva.id],
        );
      if (conTareas.has(reserva.id)) {
        throw new BadRequestException(
          'No se puede registrar control hasta cerrar las tareas operativas pendientes',
        );
      }

      const row = manager.getRepository(ControlPreEntrega).create({
        reserva,
        aromaScore: dto.aromaScore,
        aromaObs: dto.aromaObs?.trim() || null,
        planchadoScore: dto.planchadoScore,
        planchadoObs: dto.planchadoObs?.trim() || null,
        sastreriaScore: dto.sastreriaScore,
        sastreriaObs: dto.sastreriaObs?.trim() || null,
        higieneScore: dto.higieneScore,
        higieneObs: dto.higieneObs?.trim() || null,
        complementosScore: dto.complementosScore,
        complementosObs: dto.complementosObs?.trim() || null,
        estado: dto.estado,
        motivoRechazo:
          dto.estado === EstadoControlPreEntrega.RECHAZADO
            ? dto.motivoRechazo!.trim()
            : null,
        auditorNombre: dto.auditorNombre.trim(),
        fechaResolucion: null,
        resueltoPor: null,
      });

      const guardado = await manager.getRepository(ControlPreEntrega).save(row);

      if (dto.estado === EstadoControlPreEntrega.APROBADO) {
        reserva.estadoReserva = EstadoReserva.LISTO_PARA_ENTREGAR;
        await manager.getRepository(Reserva).save(reserva);
      }

      return manager.getRepository(ControlPreEntrega).findOneOrFail({
        where: { id: guardado.id },
        relations: ['reserva'],
      });
    });
  }

  async listarRechazados(): Promise<RechazoPreEntregaDto[]> {
    const rows = await this.controlRepository.find({
      where: { estado: EstadoControlPreEntrega.RECHAZADO },
      relations: ['reserva'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((c) => ({
      id: c.id,
      reservaId: c.reserva.id,
      fechaReserva: c.reserva.fechaReserva,
      clienteNombre: c.reserva.clienteNombre,
      motivoRechazo: c.motivoRechazo,
      auditorNombre: c.auditorNombre,
      estado: c.estado,
      createdAt:
        c.createdAt instanceof Date
          ? c.createdAt.toISOString()
          : String(c.createdAt),
    }));
  }

  async resolverRechazo(
    id: number,
    dto: ResolverRechazoPreEntregaDto,
  ): Promise<ControlPreEntrega> {
    return this.dataSource.transaction(async (manager) => {
      const row = await manager.getRepository(ControlPreEntrega).findOne({
        where: { id },
        relations: ['reserva', 'reserva.saco', 'reserva.pantalon'],
      });
      if (!row) {
        throw new NotFoundException('Registro de control no encontrado');
      }
      if (row.estado !== EstadoControlPreEntrega.RECHAZADO) {
        throw new BadRequestException(
          'Solo se pueden resolver registros en estado RECHAZADO',
        );
      }
      if (!this.prendasEnTienda(row.reserva)) {
        throw new BadRequestException(
          'Las prendas deben estar en tienda para marcar listo para entregar',
        );
      }

      row.estado = EstadoControlPreEntrega.RESUELTO;
      row.fechaResolucion = DateUtils.getTodayDateOnly();
      row.resueltoPor = dto.resueltoPor.trim();
      await manager.getRepository(ControlPreEntrega).save(row);

      row.reserva.estadoReserva = EstadoReserva.LISTO_PARA_ENTREGAR;
      await manager.getRepository(Reserva).save(row.reserva);

      return manager.getRepository(ControlPreEntrega).findOneOrFail({
        where: { id: row.id },
        relations: ['reserva'],
      });
    });
  }

  private prendasEnTienda(reserva: Reserva): boolean {
    if (reserva.saco.ubicacionActual !== EstadoUbicacionPrenda.TIENDA) {
      return false;
    }
    if (
      reserva.pantalon &&
      reserva.pantalon.ubicacionActual !== EstadoUbicacionPrenda.TIENDA
    ) {
      return false;
    }
    return true;
  }
}
