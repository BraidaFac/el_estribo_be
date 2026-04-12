import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { differenceInCalendarDays } from 'date-fns';
import { BloqueoPlannerService } from 'src/modules/bloqueos/service/bloqueo-planner.service';
import { BloqueosService } from 'src/modules/bloqueos/service/bloqueos.service';
import {
  DecisionLavadoPostDevolucion,
  EstadoAgendaMedicion,
  EstadoReserva,
  EstadoTareaOperativa,
  EstadoUbicacionPrenda,
  PrioridadTareaOperativa,
  TipoBloqueo,
  TipoPrenda,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Modista } from 'src/modules/modistas/entity/modista.entity';
import { OperacionesPrendaService } from 'src/modules/operaciones-prenda/service/operaciones-prenda.service';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { AsignacionServicioReserva } from 'src/modules/reservas/entity/asignacion-servicio-reserva.entity';
import { RecepcionDevolucionReserva } from 'src/modules/reservas/entity/recepcion-devolucion-reserva.entity';
import { Reserva } from 'src/modules/reservas/entity/reserva.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import { User } from 'src/user/user.entity';
import { DateUtils } from 'src/utils/date_utils';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { AccionTareaOperativaDto } from '../dto/accion-tarea-operativa.dto';
import { EnviarLavanderiaLoteDto } from '../dto/enviar-lavanderia-lote.dto';
import { EnviarLavanderiaReservaDto } from '../dto/enviar-lavanderia-reserva.dto';
import { EnviarModistaReservaDto } from '../dto/enviar-modista-reserva.dto';
import { ProgramarMedicionDto } from '../dto/programar-medicion.dto';
import { RetirarLavanderiaLoteDto } from '../dto/retirar-lavanderia-lote.dto';
import { RecibirModistaDto } from '../dto/recibir-modista.dto';
import { AgendaMedicion } from '../entity/agenda-medicion.entity';
import { TareaOperativa } from '../entity/tarea-operativa.entity';

export type TareaLavanderiaItemDto = {
  id: number;
  tipoPrenda: TipoPrenda | null;
  codigoPrenda: string | null;
  reservaId: number | null;
  clienteNombre: string | null;
  decisionLavado: DecisionLavadoPostDevolucion | null;
  proximaReservaFecha: string | null;
  prioridad: PrioridadTareaOperativa;
  lavanderiaId: number | null;
  lavanderiaNombre: string | null;
  fechaIngresoLavanderia: string | null;
  fechaRetiroLavanderia: string | null;
  estado: EstadoTareaOperativa;
};

@Injectable()
export class TareasOperativasService {
  constructor(
    @InjectRepository(TareaOperativa)
    private readonly tareaRepository: Repository<TareaOperativa>,
    @InjectRepository(AsignacionServicioReserva)
    private readonly asignacionServicioRepository: Repository<AsignacionServicioReserva>,
    @InjectRepository(AgendaMedicion)
    private readonly agendaRepository: Repository<AgendaMedicion>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Saco)
    private readonly sacoRepository: Repository<Saco>,
    @InjectRepository(Pantalon)
    private readonly pantalonRepository: Repository<Pantalon>,
    @InjectRepository(Lavanderia)
    private readonly lavanderiaRepository: Repository<Lavanderia>,
    @InjectRepository(RecepcionDevolucionReserva)
    private readonly recepcionRepository: Repository<RecepcionDevolucionReserva>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly bloqueoPlannerService: BloqueoPlannerService,
    private readonly bloqueosService: BloqueosService,
    private readonly operacionesPrendaService: OperacionesPrendaService,
  ) {}

  async listar(params?: {
    tipoTarea?: TipoTareaOperativa;
    estado?: EstadoTareaOperativa;
    prioridad?: PrioridadTareaOperativa;
    reservaIds?: number[];
  }): Promise<TareaOperativa[]> {
    await this.asegurarTareasContactoMedicion();

    const qb = this.tareaRepository
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.reserva', 'reserva')
      .leftJoinAndSelect('reserva.pantalon', 'reservaPantalon')
      .leftJoinAndSelect('reserva.saco', 'reservaSaco')
      .leftJoinAndSelect('tarea.saco', 'saco')
      .leftJoinAndSelect('tarea.pantalon', 'pantalon')
      .where('1=1');

    if (params?.tipoTarea) {
      qb.andWhere('tarea.tipoTarea = :tipoTarea', {
        tipoTarea: params.tipoTarea,
      });
    }
    if (params?.estado) {
      qb.andWhere('tarea.estado = :estado', { estado: params.estado });
    }
    if (params?.prioridad) {
      qb.andWhere('tarea.prioridad = :prioridad', {
        prioridad: params.prioridad,
      });
    }

    if (params?.reservaIds?.length) {
      qb.andWhere('reserva.id IN (:...reservaIds)', {
        reservaIds: params.reservaIds,
      });
    }

    if (params?.tipoTarea === TipoTareaOperativa.CONTACTAR_MEDICION) {
      qb.andWhere(
        'tarea.estado != :estadoCompletada AND tarea.estado != :estadoCancelada',
        {
          estadoCompletada: EstadoTareaOperativa.COMPLETADA,
          estadoCancelada: EstadoTareaOperativa.CANCELADA,
        },
      );
    }

    qb.orderBy(
      `CASE tarea.prioridad
      WHEN '${PrioridadTareaOperativa.ALTA}' THEN 1
      WHEN '${PrioridadTareaOperativa.MEDIA}' THEN 2
      ELSE 3 END`,
      'ASC',
    )
      .addOrderBy('tarea.fechaObjetivoDesde', 'ASC')
      .addOrderBy('tarea.createdAt', 'ASC');

    const tareas = await qb.getMany();

    await this.adjuntarAsignacionesServicioEnTareas(tareas);
    return tareas;
  }

  /**
   * Reservas con al menos una tarea operativa abierta (misma regla que el dashboard).
   * No ejecuta `asegurarTareasContactoMedicion` para evitar efectos secundarios en GET.
   */
  async reservasIdsConTareasOperativasAbiertas(
    reservaIds: number[],
  ): Promise<Set<number>> {
    if (reservaIds.length === 0) {
      return new Set();
    }
    const raw = await this.tareaRepository
      .createQueryBuilder('tarea')
      .select('tarea.reserva_id', 'rid')
      .distinct(true)
      .where('tarea.reserva_id IN (:...ids)', { ids: reservaIds })
      .andWhere(
        '(tarea.tipo_tarea IN (:...tiposLlevar) AND tarea.estado IN (:...estadosLlevar)) OR (tarea.tipo_tarea = :contactar AND tarea.estado NOT IN (:...cerrados))',
        {
          tiposLlevar: [
            TipoTareaOperativa.LLEVAR_LAVANDERIA,
            TipoTareaOperativa.LLEVAR_MODISTA,
          ],
          estadosLlevar: [
            EstadoTareaOperativa.PENDIENTE,
            EstadoTareaOperativa.EN_PROCESO,
          ],
          contactar: TipoTareaOperativa.CONTACTAR_MEDICION,
          cerrados: [
            EstadoTareaOperativa.COMPLETADA,
            EstadoTareaOperativa.CANCELADA,
          ],
        },
      )
      .getRawMany();
    const out = new Set<number>();
    for (const row of raw) {
      const v = row.rid;
      const n = Number(v);
      if (Number.isInteger(n) && n > 0) {
        out.add(n);
      }
    }
    return out;
  }

  /**
   * Tareas operativas abiertas: lavandería/modista (pendiente o en proceso) y
   * contactar medición (excluye completadas/canceladas).
   */
  async listarTareasPendientesParaDashboard(): Promise<TareaOperativa[]> {
    await this.asegurarTareasContactoMedicion();

    const qb = this.tareaRepository
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.reserva', 'reserva')
      .leftJoinAndSelect('reserva.pantalon', 'reservaPantalon')
      .leftJoinAndSelect('tarea.saco', 'saco')
      .leftJoinAndSelect('tarea.pantalon', 'pantalon')
      .where(
        '(tarea.tipoTarea IN (:...tiposLlevar) AND tarea.estado IN (:...estadosLlevar)) OR (tarea.tipoTarea = :contactar AND tarea.estado NOT IN (:...cerrados))',
        {
          tiposLlevar: [
            TipoTareaOperativa.LLEVAR_LAVANDERIA,
            TipoTareaOperativa.LLEVAR_MODISTA,
          ],
          estadosLlevar: [
            EstadoTareaOperativa.PENDIENTE,
            EstadoTareaOperativa.EN_PROCESO,
          ],
          contactar: TipoTareaOperativa.CONTACTAR_MEDICION,
          cerrados: [
            EstadoTareaOperativa.COMPLETADA,
            EstadoTareaOperativa.CANCELADA,
          ],
        },
      )
      .orderBy(
        `CASE tarea.prioridad
      WHEN '${PrioridadTareaOperativa.ALTA}' THEN 1
      WHEN '${PrioridadTareaOperativa.MEDIA}' THEN 2
      ELSE 3 END`,
        'ASC',
      )
      .addOrderBy('tarea.fechaObjetivoDesde', 'ASC')
      .addOrderBy('tarea.createdAt', 'ASC');

    const tareas = await qb.getMany();
    await this.adjuntarAsignacionesServicioEnTareas(tareas);
    return tareas;
  }

  private async adjuntarAsignacionesServicioEnTareas(
    tareas: TareaOperativa[],
  ): Promise<void> {
    const ids = [
      ...new Set(
        tareas
          .map((t) => t.reserva?.id)
          .filter((id): id is number => id != null),
      ),
    ];
    if (ids.length === 0) return;
    const rows = await this.asignacionServicioRepository.find({
      where: { reserva: { id: In(ids) } },
      relations: ['lavanderia', 'modista', 'reserva'],
    });
    const map = new Map<number, AsignacionServicioReserva[]>();
    for (const row of rows) {
      const rid = row.reserva.id;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(row);
    }
    for (const t of tareas) {
      if (t.reserva) {
        t.reserva.asignacionesServicio = map.get(t.reserva.id) ?? [];
      }
    }
  }

  private async patchAsignacionServicio(
    manager: EntityManager,
    reservaId: number,
    tipoPrenda: TipoPrenda,
    patch: { lavanderia?: Lavanderia | null; modista?: Modista | null },
  ): Promise<void> {
    const repo = manager.getRepository(AsignacionServicioReserva);
    let row = await repo.findOne({
      where: { reserva: { id: reservaId }, tipoPrenda },
    });
    if (!row) {
      row = repo.create({
        reserva: { id: reservaId } as Reserva,
        tipoPrenda,
        lavanderia: null,
        modista: null,
      });
    }
    if (patch.lavanderia !== undefined) {
      row.lavanderia = patch.lavanderia;
    }
    if (patch.modista !== undefined) {
      row.modista = patch.modista;
    }
    await repo.save(row);
  }

  async listarAgenda(
    desde?: string,
    hasta?: string,
    incluirTodosLosEstados?: string,
  ): Promise<AgendaMedicion[]> {
    const qb = this.agendaRepository
      .createQueryBuilder('agenda')
      .leftJoinAndSelect('agenda.reserva', 'reserva')
      .leftJoinAndSelect('reserva.pantalon', 'reservaPantalon')
      .leftJoinAndSelect('agenda.tareaOperativa', 'tarea')
      .orderBy('agenda.fechaHoraCita', 'ASC');

    if (desde) {
      const normalizada = DateUtils.normalizeDateOnly(desde);
      if (!normalizada) {
        throw new BadRequestException('desde debe tener formato yyyy-MM-dd');
      }
      qb.andWhere('DATE(agenda.fechaHoraCita) >= :desde', {
        desde: normalizada,
      });
    }
    if (hasta) {
      const normalizada = DateUtils.normalizeDateOnly(hasta);
      if (!normalizada) {
        throw new BadRequestException('hasta debe tener formato yyyy-MM-dd');
      }
      qb.andWhere('DATE(agenda.fechaHoraCita) <= :hasta', {
        hasta: normalizada,
      });
    }

    if (incluirTodosLosEstados !== 'true') {
      qb.andWhere('agenda.estado IN (:...estadosVistaOperativa)', {
        estadosVistaOperativa: [
          EstadoAgendaMedicion.PROGRAMADA,
          EstadoAgendaMedicion.NO_ASISTIO,
          EstadoAgendaMedicion.REPROGRAMADA,
        ],
      });
    }

    return qb.getMany();
  }

  async actualizarEstado(
    tareaId: number,
    estado: EstadoTareaOperativa,
    usuarioId?: string,
    motivo?: string,
  ): Promise<TareaOperativa> {
    const tarea = await this.obtenerTarea(tareaId);
    tarea.estado = estado;
    tarea.resueltoPor =
      estado === EstadoTareaOperativa.COMPLETADA
        ? ({ id: usuarioId } as User)
        : null;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      ultimoCambioEstadoMotivo: motivo ?? null,
    };
    await this.tareaRepository.save(tarea);
    return this.obtenerTarea(tareaId);
  }

  async marcarEnviadoLavanderia(
    tareaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<TareaOperativa> {
    return this.dataSource.transaction(async (manager) => {
      const tarea = await this.obtenerTareaConManager(tareaId, manager);
      if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_LAVANDERIA) {
        throw new BadRequestException(
          'Solo se puede enviar a lavanderia tareas de tipo LLEVAR_LAVANDERIA',
        );
      }

      if (!tarea.tipoPrenda) {
        throw new BadRequestException('La tarea no tiene prenda asociada');
      }

      const ubicActualLav =
        tarea.tipoPrenda === TipoPrenda.SACO
          ? tarea.saco?.ubicacionActual
          : tarea.pantalon?.ubicacionActual;
      if (!ubicActualLav) {
        throw new BadRequestException(
          'No se puede determinar la ubicación de la prenda',
        );
      }
      this.assertPrendaEnTienda(ubicActualLav, tarea.tipoPrenda);

      await this.operacionesPrendaService.actualizarUbicacion(
        tarea.tipoPrenda,
        tarea.tipoPrenda === TipoPrenda.SACO
          ? (tarea.saco?.id ?? 0)
          : (tarea.pantalon?.id ?? 0),
        EstadoUbicacionPrenda.EN_LAVANDERIA,
        {
          manager,
          usuarioId: usuarioId ?? null,
          motivo: motivo ?? 'Enviado a lavanderia desde planilla',
          reservaId: tarea.reserva?.id ?? null,
          tareaOperativaId: tarea.id,
        },
      );

      tarea.estado = EstadoTareaOperativa.EN_PROCESO;
      tarea.metadataJson = {
        ...(tarea.metadataJson ?? {}),
        enviadoLavanderiaAt: new Date().toISOString(),
      };
      await manager.getRepository(TareaOperativa).save(tarea);
      return this.obtenerTareaConManager(tarea.id, manager);
    });
  }

  async marcarRecibidoLavanderia(
    tareaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<TareaOperativa> {
    return this.dataSource.transaction(async (manager) => {
      const tarea = await this.obtenerTareaConManager(tareaId, manager);
      await this.ejecutarReciboLavanderiaSobreTarea(
        manager,
        tarea,
        usuarioId ?? null,
        motivo ?? null,
      );
      return this.obtenerTareaConManager(tarea.id, manager);
    });
  }

  /**
   * Recibe de lavandería todas las prendas de la reserva que estén EN_PROCESO en envío a lavandería.
   */
  async registrarRecibirLavanderiaPorReserva(
    reservaId: number,
    dto: AccionTareaOperativaDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TareaOperativa);
      const tareas = await repo.find({
        where: {
          reserva: { id: reservaId } as any,
          tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
          estado: EstadoTareaOperativa.EN_PROCESO,
        },
        relations: ['saco', 'pantalon', 'reserva'],
      });
      if (tareas.length === 0) {
        throw new BadRequestException(
          'No hay prendas en lavanderia pendientes de recepcion para esta reserva',
        );
      }
      for (const t of tareas) {
        await this.ejecutarReciboLavanderiaSobreTarea(
          manager,
          t,
          dto.usuarioId ?? null,
          dto.motivo ?? null,
        );
      }
    });
  }

  async marcarEnviadoModista(
    tareaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<TareaOperativa> {
    return this.dataSource.transaction(async (manager) => {
      const tarea = await this.obtenerTareaConManager(tareaId, manager);
      if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_MODISTA) {
        throw new BadRequestException(
          'Solo se puede enviar a modista tareas de tipo LLEVAR_MODISTA',
        );
      }
      if (!tarea.tipoPrenda) {
        throw new BadRequestException('La tarea no tiene prenda asociada');
      }

      const ubicActualMod =
        tarea.tipoPrenda === TipoPrenda.SACO
          ? tarea.saco?.ubicacionActual
          : tarea.pantalon?.ubicacionActual;
      if (!ubicActualMod) {
        throw new BadRequestException(
          'No se puede determinar la ubicación de la prenda',
        );
      }
      this.assertPrendaEnTienda(ubicActualMod, tarea.tipoPrenda);

      await this.operacionesPrendaService.actualizarUbicacion(
        tarea.tipoPrenda,
        tarea.tipoPrenda === TipoPrenda.SACO
          ? (tarea.saco?.id ?? 0)
          : (tarea.pantalon?.id ?? 0),
        EstadoUbicacionPrenda.EN_MODISTA,
        {
          manager,
          usuarioId: usuarioId ?? null,
          motivo: motivo ?? 'Enviado a modista desde planilla',
          reservaId: tarea.reserva?.id ?? null,
          tareaOperativaId: tarea.id,
        },
      );
      tarea.estado = EstadoTareaOperativa.EN_PROCESO;
      tarea.metadataJson = {
        ...(tarea.metadataJson ?? {}),
        enviadoModistaAt: new Date().toISOString(),
      };
      await manager.getRepository(TareaOperativa).save(tarea);
      return this.obtenerTareaConManager(tarea.id, manager);
    });
  }

  async marcarRecibidoModista(
    tareaId: number,
    dto: RecibirModistaDto,
  ): Promise<TareaOperativa> {
    return this.dataSource.transaction(async (manager) => {
      const tarea = await this.obtenerTareaConManager(tareaId, manager);
      await this.ejecutarReciboModistaSobreTarea(
        manager,
        tarea,
        dto.usuarioId ?? null,
        dto.motivo ?? null,
        dto.costoModista,
      );
      return this.obtenerTareaConManager(tarea.id, manager);
    });
  }

  async registrarRecibirModistaPorReserva(
    reservaId: number,
    dto: RecibirModistaDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(TareaOperativa);
      const tareas = await repo.find({
        where: {
          reserva: { id: reservaId } as any,
          tipoTarea: TipoTareaOperativa.LLEVAR_MODISTA,
          estado: EstadoTareaOperativa.EN_PROCESO,
        },
        relations: ['saco', 'pantalon', 'reserva'],
      });
      if (tareas.length === 0) {
        throw new BadRequestException(
          'No hay prendas en modista pendientes de recepcion para esta reserva',
        );
      }
      for (const t of tareas) {
        await this.ejecutarReciboModistaSobreTarea(
          manager,
          t,
          dto.usuarioId ?? null,
          dto.motivo ?? null,
          dto.costoModista,
        );
      }
    });
  }

  private async ejecutarReciboLavanderiaSobreTarea(
    manager: EntityManager,
    tarea: TareaOperativa,
    usuarioId: string | null,
    motivo: string | null,
  ): Promise<void> {
    if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_LAVANDERIA) {
      throw new BadRequestException(
        'Solo se puede recibir de lavanderia tareas de tipo LLEVAR_LAVANDERIA',
      );
    }
    if (!tarea.tipoPrenda) {
      throw new BadRequestException('La tarea no tiene prenda asociada');
    }
    await this.operacionesPrendaService.actualizarUbicacion(
      tarea.tipoPrenda,
      tarea.tipoPrenda === TipoPrenda.SACO
        ? (tarea.saco?.id ?? 0)
        : (tarea.pantalon?.id ?? 0),
      EstadoUbicacionPrenda.TIENDA,
      {
        manager,
        usuarioId,
        motivo: motivo ?? 'Recibido de lavanderia desde planilla',
        reservaId: tarea.reserva?.id ?? null,
        tareaOperativaId: tarea.id,
      },
    );
    tarea.estado = EstadoTareaOperativa.COMPLETADA;
    tarea.resueltoPor = usuarioId ? ({ id: usuarioId } as User) : null;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      recibidoLavanderiaAt: new Date().toISOString(),
    };
    await manager.getRepository(TareaOperativa).save(tarea);
    if (tarea.reserva?.id) {
      await this.patchAsignacionServicio(
        manager,
        tarea.reserva.id,
        tarea.tipoPrenda,
        { lavanderia: null },
      );
    }
  }

  private async ejecutarReciboModistaSobreTarea(
    manager: EntityManager,
    tarea: TareaOperativa,
    usuarioId: string | null,
    motivo: string | null,
    costoModista: number | null,
  ): Promise<void> {
    if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_MODISTA) {
      throw new BadRequestException(
        'Solo se puede recibir de modista tareas de tipo LLEVAR_MODISTA',
      );
    }
    if (!tarea.tipoPrenda) {
      throw new BadRequestException('La tarea no tiene prenda asociada');
    }
    await this.operacionesPrendaService.actualizarUbicacion(
      tarea.tipoPrenda,
      tarea.tipoPrenda === TipoPrenda.SACO
        ? (tarea.saco?.id ?? 0)
        : (tarea.pantalon?.id ?? 0),
      EstadoUbicacionPrenda.TIENDA,
      {
        manager,
        usuarioId,
        motivo: motivo ?? 'Recibido de modista desde planilla',
        reservaId: tarea.reserva?.id ?? null,
        tareaOperativaId: tarea.id,
      },
    );
    tarea.estado = EstadoTareaOperativa.COMPLETADA;
    tarea.resueltoPor = usuarioId ? ({ id: usuarioId } as User) : null;
    tarea.costoModista = costoModista;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      recibidoModistaAt: new Date().toISOString(),
      costoModistaRegistradoAt: new Date().toISOString(),
    };
    await manager.getRepository(TareaOperativa).save(tarea);
    if (tarea.reserva?.id) {
      await this.patchAsignacionServicio(
        manager,
        tarea.reserva.id,
        tarea.tipoPrenda,
        { modista: null },
      );
    }
  }

  async programarMedicion(
    tareaId: number,
    dto: ProgramarMedicionDto,
  ): Promise<AgendaMedicion> {
    return this.dataSource.transaction(async (manager) => {
      const tarea = await this.obtenerTareaConManager(tareaId, manager);
      if (tarea.tipoTarea !== TipoTareaOperativa.CONTACTAR_MEDICION) {
        throw new BadRequestException(
          'Solo se puede agendar medicion desde tareas de contacto',
        );
      }
      if (!tarea.reserva) {
        throw new BadRequestException('La tarea no tiene reserva asociada');
      }
      const fechaCita = new Date(dto.fechaHoraCita);
      if (Number.isNaN(fechaCita.getTime())) {
        throw new BadRequestException('fechaHoraCita invalida');
      }
      if (
        !dto.noValidarFecha &&
        tarea.fechaObjetivoDesde &&
        tarea.fechaObjetivoHasta
      ) {
        const citaKey = DateUtils.formatDateOnly(fechaCita);
        if (
          citaKey < tarea.fechaObjetivoDesde ||
          citaKey > tarea.fechaObjetivoHasta
        ) {
          throw new BadRequestException(
            'La cita debe quedar dentro de la ventana de medicion',
          );
        }
      }

      const cerradosAgenda: EstadoAgendaMedicion[] = [
        EstadoAgendaMedicion.ASISTIO,
        EstadoAgendaMedicion.NO_ASISTIO,
        EstadoAgendaMedicion.CANCELADA,
      ];

      const agendaIdPrevio = tarea.metadataJson?.agendaMedicionId as
        | number
        | undefined;
      if (agendaIdPrevio) {
        const repoAgenda = manager.getRepository(AgendaMedicion);
        const existente = await repoAgenda.findOne({
          where: { id: agendaIdPrevio },
        });
        if (existente) {
          if (cerradosAgenda.includes(existente.estado)) {
            throw new BadRequestException(
              'La cita ya fue cerrada en la agenda; no se puede reagendar desde aqui',
            );
          }
          existente.fechaHoraCita = fechaCita;
          if (dto.observaciones !== undefined) {
            existente.observaciones = dto.observaciones?.trim() ?? null;
          }
          const guardada = await repoAgenda.save(existente);

          tarea.estado = EstadoTareaOperativa.EN_PROCESO;
          tarea.metadataJson = {
            ...(tarea.metadataJson ?? {}),
            yaHablado: true,
            agendaMedicionId: guardada.id,
            fechaHoraCitaAgendada: fechaCita.toISOString(),
            observacionesAgenda: dto.observaciones?.trim() ?? null,
          };
          await manager.getRepository(TareaOperativa).save(tarea);
          return guardada;
        }
      }

      const agendaNueva = manager.getRepository(AgendaMedicion).create({
        reserva: tarea.reserva,
        tareaOperativa: tarea,
        clienteNombreSnapshot:
          tarea.clienteNombre ?? tarea.reserva.clienteNombre,
        clienteTelefonoSnapshot: tarea.clienteTelefono ?? '',
        fechaHoraCita: fechaCita,
        estado: EstadoAgendaMedicion.PROGRAMADA,
        observaciones: dto.observaciones?.trim() ?? null,
      });
      const agendaGuardada = await manager
        .getRepository(AgendaMedicion)
        .save(agendaNueva);

      tarea.estado = EstadoTareaOperativa.EN_PROCESO;
      tarea.metadataJson = {
        ...(tarea.metadataJson ?? {}),
        yaHablado: true,
        agendaMedicionId: agendaGuardada.id,
        fechaHoraCitaAgendada: fechaCita.toISOString(),
        observacionesAgenda: dto.observaciones?.trim() ?? null,
      };
      await manager.getRepository(TareaOperativa).save(tarea);

      return agendaGuardada;
    });
  }

  async actualizarEstadoAgendaMedicion(
    agendaId: number,
    estado: EstadoAgendaMedicion,
    observaciones?: string,
  ): Promise<AgendaMedicion> {
    const agenda = await this.agendaRepository.findOne({
      where: { id: agendaId },
      relations: ['reserva', 'tareaOperativa'],
    });
    if (!agenda) {
      throw new NotFoundException('Cita de agenda no encontrada');
    }

    const cerrados: EstadoAgendaMedicion[] = [
      EstadoAgendaMedicion.ASISTIO,
      EstadoAgendaMedicion.NO_ASISTIO,
      EstadoAgendaMedicion.CANCELADA,
    ];
    if (cerrados.includes(agenda.estado)) {
      throw new BadRequestException(
        'La cita ya esta cerrada y no admite mas cambios de estado',
      );
    }

    agenda.estado = estado;
    if (observaciones?.trim()) {
      const extra = observaciones.trim();
      agenda.observaciones = agenda.observaciones
        ? `${agenda.observaciones} | ${extra}`
        : extra;
    }
    return this.agendaRepository.save(agenda);
  }

  async marcarContactoMedicion(tareaId: number): Promise<TareaOperativa> {
    const tarea = await this.obtenerTarea(tareaId);
    if (tarea.tipoTarea !== TipoTareaOperativa.CONTACTAR_MEDICION) {
      throw new BadRequestException(
        'Solo aplica a tareas de tipo CONTACTAR_MEDICION',
      );
    }
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      yaHablado: true,
      contactoClienteAt: new Date().toISOString(),
    };
    await this.tareaRepository.save(tarea);
    return this.obtenerTarea(tareaId);
  }

  /**
   * Tras persistir mediciones: cierra tarea de contacto, marca citas abiertas como ASISTIO
   * y crea LLEVAR_MODISTA por prenda (si la reserva requiere modista).
   */
  async aplicarEfectosPostGuardadoMediciones(
    reservaId: number,
    usuarioId: string | null,
    sinModista: boolean,
    manager: EntityManager,
  ): Promise<void> {
    const repoReserva = manager.getRepository(Reserva);
    const reserva = await repoReserva.findOne({
      where: { id: reservaId },
      relations: ['saco', 'pantalon'],
    });
    if (!reserva || reserva.estadoReserva === EstadoReserva.CANCELADA) {
      return;
    }

    const repoTarea = manager.getRepository(TareaOperativa);
    const tareasContacto = await repoTarea.find({
      where: {
        tipoTarea: TipoTareaOperativa.CONTACTAR_MEDICION,
        reserva: { id: reservaId } as any,
        estado: Not(EstadoTareaOperativa.CANCELADA),
      },
      relations: ['reserva'],
    });

    const ahoraIso = new Date().toISOString();
    for (const tareaContacto of tareasContacto) {
      if (tareaContacto.estado === EstadoTareaOperativa.COMPLETADA) {
        continue;
      }
      tareaContacto.estado = EstadoTareaOperativa.COMPLETADA;
      tareaContacto.resueltoPor = usuarioId
        ? ({ id: usuarioId } as User)
        : null;
      tareaContacto.metadataJson = {
        ...(tareaContacto.metadataJson ?? {}),
        medicionesRegistradasAt: ahoraIso,
      };
      await repoTarea.save(tareaContacto);
    }

    const repoAgenda = manager.getRepository(AgendaMedicion);
    await repoAgenda
      .createQueryBuilder()
      .update(AgendaMedicion)
      .set({ estado: EstadoAgendaMedicion.ASISTIO })
      .where('reserva_id = :reservaId', { reservaId })
      .andWhere('estado IN (:...estadosAbiertos)', {
        estadosAbiertos: [
          EstadoAgendaMedicion.PROGRAMADA,
          EstadoAgendaMedicion.REPROGRAMADA,
        ],
      })
      .execute();

    if (sinModista) {
      await this.aplicarDecisionModistaPrenda(
        manager,
        reserva,
        TipoPrenda.SACO,
        reserva.saco.id,
        false,
        undefined,
        usuarioId,
      );
      if (reserva.pantalon) {
        await this.aplicarDecisionModistaPrenda(
          manager,
          reserva,
          TipoPrenda.PANTALON,
          reserva.pantalon.id,
          false,
          undefined,
          usuarioId,
        );
      }
      return;
    }

    if (!reserva.requiereModista) {
      return;
    }

    await this.crearTareaModistaPorPrenda(
      {
        tipoPrenda: TipoPrenda.SACO,
        prendaId: reserva.saco.id,
        reserva,
        usuarioId,
      },
      manager,
    );

    if (reserva.pantalon) {
      await this.crearTareaModistaPorPrenda(
        {
          tipoPrenda: TipoPrenda.PANTALON,
          prendaId: reserva.pantalon.id,
          reserva,
          usuarioId,
        },
        manager,
      );
    }
  }

  async crearTareasLavanderiaPostDevolucion(
    reservaId: number,
    usuarioId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repoReserva = manager
      ? manager.getRepository(Reserva)
      : this.reservaRepository;
    const reserva = await repoReserva.findOne({
      where: { id: reservaId },
      relations: ['saco', 'pantalon'],
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada para crear tareas');
    }

    await this.crearTareaLavanderiaPorPrenda(
      {
        tipoPrenda: TipoPrenda.SACO,
        prendaId: reserva.saco.id,
        reserva,
        usuarioId: usuarioId ?? null,
      },
      manager,
    );

    if (reserva.pantalon) {
      await this.crearTareaLavanderiaPorPrenda(
        {
          tipoPrenda: TipoPrenda.PANTALON,
          prendaId: reserva.pantalon.id,
          reserva,
          usuarioId: usuarioId ?? null,
        },
        manager,
      );
    }
  }

  /**
   * Envío (u omisión) a lavandería por reserva: actualiza prenda, bloqueos y tareas LLEVAR_LAVANDERIA.
   */
  async registrarEnvioLavanderiaPorReserva(
    reservaId: number,
    dto: EnviarLavanderiaReservaDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reserva = await manager.getRepository(Reserva).findOne({
        where: { id: reservaId },
        relations: ['saco', 'pantalon'],
      });
      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reserva.estadoReserva === EstadoReserva.CANCELADA) {
        throw new BadRequestException('Reserva cancelada');
      }

      await this.aplicarDecisionLavanderiaPrenda(
        manager,
        reserva,
        TipoPrenda.SACO,
        reserva.saco.id,
        dto.sacoVaALavanderia,
        dto.sacoVaALavanderia ? dto.sacoLavanderiaId : undefined,
        dto.usuarioId ?? null,
      );

      if (reserva.pantalon) {
        if (dto.pantalonVaALavanderia === undefined) {
          throw new BadRequestException(
            'Indique si el pantalon va a lavanderia (pantalonVaALavanderia)',
          );
        }
        await this.aplicarDecisionLavanderiaPrenda(
          manager,
          reserva,
          TipoPrenda.PANTALON,
          reserva.pantalon.id,
          dto.pantalonVaALavanderia,
          dto.pantalonVaALavanderia ? dto.pantalonLavanderiaId : undefined,
          dto.usuarioId ?? null,
        );
      }
    });
  }

  // ─── Planilla Lavandería ────────────────────────────────────────────────────

  async listarParaLavanderia(params: {
    tipo: 'llevar' | 'retirar';
    lavanderiaId?: number;
  }): Promise<TareaLavanderiaItemDto[]> {
    const estado =
      params.tipo === 'llevar'
        ? EstadoTareaOperativa.PENDIENTE
        : EstadoTareaOperativa.EN_PROCESO;

    const qb = this.tareaRepository
      .createQueryBuilder('tarea')
      .leftJoinAndSelect('tarea.saco', 'saco')
      .leftJoinAndSelect('tarea.pantalon', 'pantalon')
      .leftJoinAndSelect('tarea.reserva', 'reserva')
      .leftJoinAndSelect('tarea.lavanderia', 'lavanderia')
      .where('tarea.tipoTarea = :tipoTarea', {
        tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
      })
      .andWhere('tarea.estado = :estado', { estado });

    if (params.lavanderiaId) {
      qb.andWhere('lavanderia.id = :lavanderiaId', {
        lavanderiaId: params.lavanderiaId,
      });
    }

    qb.orderBy(
      `CASE tarea.prioridad
      WHEN '${PrioridadTareaOperativa.ALTA}' THEN 1
      WHEN '${PrioridadTareaOperativa.MEDIA}' THEN 2
      ELSE 3 END`,
      'ASC',
    ).addOrderBy('tarea.createdAt', 'ASC');

    const tareas = await qb.getMany();
    if (tareas.length === 0) return [];

    // Fetch decisionLavado per reserva (post-devolución)
    const reservaIds = [
      ...new Set(
        tareas
          .map((t) => t.reserva?.id)
          .filter((id): id is number => id != null),
      ),
    ];
    const recepciones =
      reservaIds.length > 0
        ? await this.recepcionRepository.find({
            where: { reserva: { id: In(reservaIds) } },
            relations: ['reserva'],
          })
        : [];
    const recepcionMap = new Map<number, DecisionLavadoPostDevolucion>();
    for (const r of recepciones) {
      recepcionMap.set(r.reserva.id, r.decisionLavado);
    }

    // Fetch próxima reserva por prenda
    const hoy = DateUtils.getTodayDateOnly();
    const sacoIds = [
      ...new Set(tareas.filter((t) => t.saco).map((t) => t.saco!.id)),
    ];
    const pantalonIds = [
      ...new Set(tareas.filter((t) => t.pantalon).map((t) => t.pantalon!.id)),
    ];

    const proximaMap = new Map<string, string>();

    if (sacoIds.length > 0) {
      const placeholders = sacoIds.map(() => '?').join(',');
      const rows = await this.dataSource.query<
        { fecha_reserva: string; saco_id: number }[]
      >(
        `SELECT fecha_reserva, saco_id FROM reservas WHERE saco_id IN (${placeholders}) AND fecha_reserva > ? AND estado_reserva = ? ORDER BY fecha_reserva ASC`,
        [...sacoIds, hoy, EstadoReserva.CONFIRMADA],
      );
      for (const row of rows) {
        const key = `S_${row.saco_id}`;
        if (!proximaMap.has(key)) proximaMap.set(key, row.fecha_reserva);
      }
    }

    if (pantalonIds.length > 0) {
      const placeholders = pantalonIds.map(() => '?').join(',');
      const rows = await this.dataSource.query<
        { fecha_reserva: string; pantalon_id: number }[]
      >(
        `SELECT fecha_reserva, pantalon_id FROM reservas WHERE pantalon_id IN (${placeholders}) AND fecha_reserva > ? AND estado_reserva = ? ORDER BY fecha_reserva ASC`,
        [...pantalonIds, hoy, EstadoReserva.CONFIRMADA],
      );
      for (const row of rows) {
        const key = `P_${row.pantalon_id}`;
        if (!proximaMap.has(key)) proximaMap.set(key, row.fecha_reserva);
      }
    }

    return tareas.map((t) => {
      const proximaKey =
        t.tipoPrenda === TipoPrenda.SACO && t.saco
          ? `S_${t.saco.id}`
          : t.tipoPrenda === TipoPrenda.PANTALON && t.pantalon
            ? `P_${t.pantalon.id}`
            : null;

      const fechaIngreso = t.fechaIngresoLavanderia
        ? DateUtils.formatDateOnly(t.fechaIngresoLavanderia)
        : null;
      const fechaRetiro = t.fechaRetiroLavanderia
        ? DateUtils.formatDateOnly(t.fechaRetiroLavanderia)
        : null;

      const proximaReservaFecha = proximaKey
        ? (proximaMap.get(proximaKey) ?? null)
        : null;

      const prioridad = proximaReservaFecha
        ? this.calcularPrioridadPorDias(
            differenceInCalendarDays(
              new Date(`${proximaReservaFecha}T00:00:00`),
              new Date(`${hoy}T00:00:00`),
            ),
          )
        : t.prioridad;

      return {
        id: t.id,
        tipoPrenda: t.tipoPrenda,
        codigoPrenda:
          t.tipoPrenda === TipoPrenda.SACO
            ? (t.saco?.codigo ?? null)
            : (t.pantalon?.codigo ?? null),
        reservaId: t.reserva?.id ?? null,
        clienteNombre: t.clienteNombre,
        decisionLavado: t.reserva
          ? (recepcionMap.get(t.reserva.id) ?? null)
          : null,
        proximaReservaFecha,
        prioridad,
        lavanderiaId: t.lavanderia?.id ?? null,
        lavanderiaNombre: t.lavanderia?.nombre ?? null,
        fechaIngresoLavanderia: fechaIngreso,
        fechaRetiroLavanderia: fechaRetiro,
        estado: t.estado,
      };
    });
  }

  async enviarLavanderiaLote(
    dto: EnviarLavanderiaLoteDto,
    usuarioId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repoTarea = manager.getRepository(TareaOperativa);
      const tareas = await repoTarea.find({
        where: { id: In(dto.ids) },
        relations: ['saco', 'pantalon', 'reserva'],
      });

      if (tareas.length === 0) {
        throw new BadRequestException(
          'No se encontraron tareas con los ids proporcionados',
        );
      }

      const lav = await manager.getRepository(Lavanderia).findOne({
        where: { id: dto.lavanderiaId, activo: true },
      });
      if (!lav) {
        throw new BadRequestException('Lavandería no encontrada o inactiva');
      }

      const ahora = new Date();
      for (const tarea of tareas) {
        if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_LAVANDERIA) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no es de tipo LLEVAR_LAVANDERIA`,
          );
        }
        if (tarea.estado !== EstadoTareaOperativa.PENDIENTE) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no está en estado PENDIENTE`,
          );
        }
        if (!tarea.tipoPrenda) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no tiene prenda asociada`,
          );
        }

        const ubicActual =
          tarea.tipoPrenda === TipoPrenda.SACO
            ? tarea.saco?.ubicacionActual
            : tarea.pantalon?.ubicacionActual;
        if (!ubicActual) {
          throw new BadRequestException(
            `Tarea ${tarea.id}: no se puede determinar la ubicación de la prenda`,
          );
        }
        this.assertPrendaEnTienda(ubicActual, tarea.tipoPrenda);

        await this.operacionesPrendaService.actualizarUbicacion(
          tarea.tipoPrenda,
          tarea.tipoPrenda === TipoPrenda.SACO
            ? (tarea.saco?.id ?? 0)
            : (tarea.pantalon?.id ?? 0),
          EstadoUbicacionPrenda.EN_LAVANDERIA,
          {
            manager,
            usuarioId,
            motivo: 'Enviado a lavandería por lote',
            reservaId: tarea.reserva?.id ?? null,
            tareaOperativaId: tarea.id,
          },
        );

        tarea.estado = EstadoTareaOperativa.EN_PROCESO;
        tarea.lavanderia = lav;
        tarea.fechaIngresoLavanderia = ahora;
        tarea.metadataJson = {
          ...(tarea.metadataJson ?? {}),
          enviadoLavanderiaAt: ahora.toISOString(),
          lavanderiaId: lav.id,
        };
        await repoTarea.save(tarea);

        if (tarea.reserva?.id) {
          await this.patchAsignacionServicio(
            manager,
            tarea.reserva.id,
            tarea.tipoPrenda,
            { lavanderia: lav },
          );
        }
      }
    });
  }

  async retirarLavanderiaLote(
    dto: RetirarLavanderiaLoteDto,
    usuarioId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repoTarea = manager.getRepository(TareaOperativa);
      const tareas = await repoTarea.find({
        where: { id: In(dto.ids) },
        relations: ['saco', 'pantalon', 'reserva'],
      });

      if (tareas.length === 0) {
        throw new BadRequestException(
          'No se encontraron tareas con los ids proporcionados',
        );
      }

      const ahora = new Date();
      for (const tarea of tareas) {
        if (tarea.tipoTarea !== TipoTareaOperativa.LLEVAR_LAVANDERIA) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no es de tipo LLEVAR_LAVANDERIA`,
          );
        }
        if (tarea.estado !== EstadoTareaOperativa.EN_PROCESO) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no está en estado EN_PROCESO`,
          );
        }
        if (!tarea.tipoPrenda) {
          throw new BadRequestException(
            `Tarea ${tarea.id} no tiene prenda asociada`,
          );
        }

        await this.operacionesPrendaService.actualizarUbicacion(
          tarea.tipoPrenda,
          tarea.tipoPrenda === TipoPrenda.SACO
            ? (tarea.saco?.id ?? 0)
            : (tarea.pantalon?.id ?? 0),
          EstadoUbicacionPrenda.TIENDA,
          {
            manager,
            usuarioId,
            motivo: 'Retirado de lavandería por lote',
            reservaId: tarea.reserva?.id ?? null,
            tareaOperativaId: tarea.id,
          },
        );

        tarea.estado = EstadoTareaOperativa.COMPLETADA;
        tarea.resueltoPor = { id: usuarioId } as User;
        tarea.fechaRetiroLavanderia = ahora;
        tarea.metadataJson = {
          ...(tarea.metadataJson ?? {}),
          recibidoLavanderiaAt: ahora.toISOString(),
        };
        await repoTarea.save(tarea);

        if (tarea.reserva?.id) {
          await this.patchAsignacionServicio(
            manager,
            tarea.reserva.id,
            tarea.tipoPrenda,
            { lavanderia: null },
          );
        }
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────

  private async aplicarDecisionLavanderiaPrenda(
    manager: EntityManager,
    reserva: Reserva,
    tipoPrenda: TipoPrenda,
    prendaId: number,
    va: boolean,
    lavanderiaId: number | undefined,
    usuarioId: string | null,
  ): Promise<void> {
    const repoTarea = manager.getRepository(TareaOperativa);
    const tarea = await repoTarea.findOne({
      where: {
        reserva: { id: reserva.id } as any,
        tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
        tipoPrenda,
        estado: Not(EstadoTareaOperativa.CANCELADA),
      },
      relations: ['saco', 'pantalon', 'reserva'],
    });

    if (!va) {
      await this.bloqueosService.cancelarBloquesLavanderiaActivosPorReservaYPrenda(
        reserva.id,
        tipoPrenda,
        prendaId,
        usuarioId,
        'Prenda no va a lavanderia',
        manager,
      );
      await this.patchAsignacionServicio(manager, reserva.id, tipoPrenda, {
        lavanderia: null,
      });
      if (tarea && tarea.estado !== EstadoTareaOperativa.COMPLETADA) {
        tarea.estado = EstadoTareaOperativa.COMPLETADA;
        tarea.resueltoPor = usuarioId ? ({ id: usuarioId } as User) : null;
        tarea.metadataJson = {
          ...(tarea.metadataJson ?? {}),
          omitidoLavanderia: true,
          omitidoLavanderiaAt: new Date().toISOString(),
        };
        await repoTarea.save(tarea);
      }
      return;
    }

    const ubicActualDecLav =
      tipoPrenda === TipoPrenda.SACO
        ? reserva.saco.ubicacionActual
        : reserva.pantalon?.ubicacionActual;
    if (!ubicActualDecLav) {
      throw new BadRequestException(
        'No se puede determinar la ubicación de la prenda',
      );
    }
    this.assertPrendaEnTienda(ubicActualDecLav, tipoPrenda);

    if (lavanderiaId == null) {
      throw new BadRequestException(
        'Lavanderia obligatoria si la prenda va a lavanderia',
      );
    }

    const lav = await manager.getRepository(Lavanderia).findOne({
      where: { id: lavanderiaId, activo: true },
    });
    if (!lav) {
      throw new BadRequestException('Lavanderia no encontrada o inactiva');
    }

    await this.patchAsignacionServicio(manager, reserva.id, tipoPrenda, {
      lavanderia: lav,
    });

    if (!tarea) {
      throw new BadRequestException(
        'No hay tarea LLEVAR_LAVANDERIA activa para esta prenda; no se puede registrar el envio',
      );
    }
    if (tarea.estado === EstadoTareaOperativa.COMPLETADA) {
      throw new BadRequestException(
        'La tarea de lavanderia para esta prenda ya estaba completada',
      );
    }

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda,
      prendaId,
      EstadoUbicacionPrenda.EN_LAVANDERIA,
      {
        manager,
        usuarioId: usuarioId ?? null,
        motivo: 'Enviado a lavanderia desde registro por reserva',
        reservaId: reserva.id,
        tareaOperativaId: tarea.id,
      },
    );

    tarea.estado = EstadoTareaOperativa.EN_PROCESO;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      enviadoLavanderiaAt: new Date().toISOString(),
      lavanderiaId: lav.id,
    };
    await repoTarea.save(tarea);
  }

  async registrarEnvioModistaPorReserva(
    reservaId: number,
    dto: EnviarModistaReservaDto,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reserva = await manager.getRepository(Reserva).findOne({
        where: { id: reservaId },
        relations: ['saco', 'pantalon'],
      });
      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reserva.estadoReserva === EstadoReserva.CANCELADA) {
        throw new BadRequestException('Reserva cancelada');
      }

      await this.aplicarDecisionModistaPrenda(
        manager,
        reserva,
        TipoPrenda.SACO,
        reserva.saco.id,
        dto.sacoVaAModista,
        dto.sacoVaAModista ? dto.sacoModistaId : undefined,
        dto.usuarioId ?? null,
      );

      if (reserva.pantalon) {
        if (dto.pantalonVaAModista === undefined) {
          throw new BadRequestException(
            'Indique si el pantalon va a modista (pantalonVaAModista)',
          );
        }
        await this.aplicarDecisionModistaPrenda(
          manager,
          reserva,
          TipoPrenda.PANTALON,
          reserva.pantalon.id,
          dto.pantalonVaAModista,
          dto.pantalonVaAModista ? dto.pantalonModistaId : undefined,
          dto.usuarioId ?? null,
        );
      }
    });
  }

  private async aplicarDecisionModistaPrenda(
    manager: EntityManager,
    reserva: Reserva,
    tipoPrenda: TipoPrenda,
    prendaId: number,
    va: boolean,
    modistaId: number | undefined,
    usuarioId: string | null,
  ): Promise<void> {
    const repoTarea = manager.getRepository(TareaOperativa);
    const tarea = await repoTarea.findOne({
      where: {
        reserva: { id: reserva.id } as any,
        tipoTarea: TipoTareaOperativa.LLEVAR_MODISTA,
        tipoPrenda,
        estado: Not(EstadoTareaOperativa.CANCELADA),
      },
      relations: ['saco', 'pantalon', 'reserva'],
    });

    if (!va) {
      await this.bloqueosService.cancelarBloquesModistaActivosPorReservaYPrenda(
        reserva.id,
        tipoPrenda,
        prendaId,
        usuarioId,
        'Prenda no va a modista',
        manager,
      );
      await this.patchAsignacionServicio(manager, reserva.id, tipoPrenda, {
        modista: null,
      });
      if (tarea && tarea.estado !== EstadoTareaOperativa.COMPLETADA) {
        tarea.estado = EstadoTareaOperativa.COMPLETADA;
        tarea.resueltoPor = usuarioId ? ({ id: usuarioId } as User) : null;
        tarea.metadataJson = {
          ...(tarea.metadataJson ?? {}),
          omitidoModista: true,
          omitidoModistaAt: new Date().toISOString(),
        };
        await repoTarea.save(tarea);
      }
      return;
    }

    const ubicActualDecMod =
      tipoPrenda === TipoPrenda.SACO
        ? reserva.saco.ubicacionActual
        : reserva.pantalon?.ubicacionActual;
    if (!ubicActualDecMod) {
      throw new BadRequestException(
        'No se puede determinar la ubicación de la prenda',
      );
    }
    this.assertPrendaEnTienda(ubicActualDecMod, tipoPrenda);

    if (modistaId == null) {
      throw new BadRequestException(
        'Modista obligatoria si la prenda va a modista',
      );
    }

    const mod = await manager.getRepository(Modista).findOne({
      where: { id: modistaId, activo: true },
    });
    if (!mod) {
      throw new BadRequestException('Modista no encontrada o inactiva');
    }

    await this.patchAsignacionServicio(manager, reserva.id, tipoPrenda, {
      modista: mod,
    });

    if (!tarea) {
      throw new BadRequestException(
        'No hay tarea LLEVAR_MODISTA activa para esta prenda; no se puede registrar el envio',
      );
    }
    if (tarea.estado === EstadoTareaOperativa.COMPLETADA) {
      throw new BadRequestException(
        'La tarea de modista para esta prenda ya estaba completada',
      );
    }

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda,
      prendaId,
      EstadoUbicacionPrenda.EN_MODISTA,
      {
        manager,
        usuarioId: usuarioId ?? null,
        motivo: 'Enviado a modista desde registro por reserva',
        reservaId: reserva.id,
        tareaOperativaId: tarea.id,
      },
    );

    tarea.estado = EstadoTareaOperativa.EN_PROCESO;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      enviadoModistaAt: new Date().toISOString(),
      modistaId: mod.id,
    };
    await repoTarea.save(tarea);
  }

  async asegurarTareasContactoMedicion(): Promise<void> {
    const hoyKey = DateUtils.getTodayDateOnly();
    const reservas = await this.reservaRepository.find({
      where: {
        estadoReserva: In([
          EstadoReserva.CONFIRMADA,
          EstadoReserva.LISTO_PARA_ENTREGAR,
        ]),
      },
      relations: ['saco', 'pantalon'],
      order: { fechaReserva: 'ASC' },
    });

    for (const reserva of reservas) {
      const rangos = await this.bloqueoPlannerService.obtenerRangosPlanificados(
        reserva.fechaReserva,
        reserva.requiereModista,
      );
      const rangoMedicion = rangos.find(
        (rango) => rango.tipoBloqueo === TipoBloqueo.MEDICION,
      );
      if (!rangoMedicion) continue;

      const dias = differenceInCalendarDays(
        new Date(`${rangoMedicion.fin}T00:00:00`),
        new Date(`${hoyKey}T00:00:00`),
      );

      const existente = await this.tareaRepository.findOne({
        where: {
          tipoTarea: TipoTareaOperativa.CONTACTAR_MEDICION,
          reserva: { id: reserva.id } as any,
          estado: Not(EstadoTareaOperativa.CANCELADA),
        },
        relations: ['reserva'],
      });

      if (!existente) continue;
      existente.prioridad = this.calcularPrioridadPorDias(dias);
      await this.tareaRepository.save(existente);
    }
  }

  public async crearTareaContactoMedicion(
    reserva: Reserva,
    manager?: EntityManager,
    usuarioId?: string,
  ): Promise<void> {
    const hoyKey = DateUtils.getTodayDateOnly();
    const repoTarea = manager
      ? manager.getRepository(TareaOperativa)
      : this.tareaRepository;

    let bloqueoMedicion = reserva.bloqueos.find(
      (bloqueo) => bloqueo.tipoBloqueo === TipoBloqueo.MEDICION,
    );
    if (!bloqueoMedicion) return;

    const dias = differenceInCalendarDays(
      new Date(`${bloqueoMedicion.inicio}T00:00:00`),
      new Date(`${hoyKey}T00:00:00`),
    );

    await repoTarea.save(
      this.tareaRepository.create({
        tipoTarea: TipoTareaOperativa.CONTACTAR_MEDICION,
        estado: EstadoTareaOperativa.PENDIENTE,
        prioridad: this.calcularPrioridadPorDias(dias),
        reserva,
        tipoPrenda: null,
        saco: null,
        pantalon: null,
        clienteNombre: reserva.clienteNombre,
        clienteTelefono: reserva.clienteTelefono,
        fechaObjetivoDesde: bloqueoMedicion.inicio,
        fechaObjetivoHasta: bloqueoMedicion.fin,
        creadoPor: usuarioId ? ({ id: usuarioId } as User) : null,
        metadataJson: {
          fechaReserva: reserva.fechaReserva,
        },
      }),
    );
  }

  private async crearTareaLavanderiaPorPrenda(
    args: {
      tipoPrenda: TipoPrenda;
      prendaId: number;
      reserva: Reserva;
      usuarioId: string | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repoTarea = manager
      ? manager.getRepository(TareaOperativa)
      : this.tareaRepository;

    const existente = await repoTarea.findOne({
      where: {
        tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
        reserva: { id: args.reserva.id } as any,
        tipoPrenda: args.tipoPrenda,
        estado: Not(EstadoTareaOperativa.CANCELADA),
      },
    });
    if (existente) return;

    const prioridad = await this.obtenerPrioridadPorProximaReservaPrenda(
      args.tipoPrenda,
      args.prendaId,
      args.reserva.fechaReserva,
      manager,
    );

    await repoTarea.save(
      repoTarea.create({
        tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
        estado: EstadoTareaOperativa.PENDIENTE,
        prioridad,
        tipoPrenda: args.tipoPrenda,
        reserva: args.reserva,
        saco:
          args.tipoPrenda === TipoPrenda.SACO
            ? ({ id: args.prendaId } as Saco)
            : null,
        pantalon:
          args.tipoPrenda === TipoPrenda.PANTALON
            ? ({ id: args.prendaId } as Pantalon)
            : null,
        clienteNombre: args.reserva.clienteNombre,
        clienteTelefono: args.reserva.clienteTelefono,
        fechaObjetivoDesde: DateUtils.getTodayDateOnly(),
        fechaObjetivoHasta: null,
        creadoPor: args.usuarioId ? ({ id: args.usuarioId } as User) : null,
        resueltoPor: null,
        metadataJson: {
          reservaId: args.reserva.id,
          motivo: 'Post devolucion cliente',
        },
      }),
    );
  }

  private async crearTareaModistaPorPrenda(
    args: {
      tipoPrenda: TipoPrenda;
      prendaId: number;
      reserva: Reserva;
      usuarioId: string | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const repoTarea = manager
      ? manager.getRepository(TareaOperativa)
      : this.tareaRepository;

    const existente = await repoTarea.findOne({
      where: {
        tipoTarea: TipoTareaOperativa.LLEVAR_MODISTA,
        reserva: { id: args.reserva.id } as any,
        tipoPrenda: args.tipoPrenda,
        estado: Not(EstadoTareaOperativa.CANCELADA),
      },
    });
    if (existente) return;

    const prioridad = await this.obtenerPrioridadPorProximaReservaPrenda(
      args.tipoPrenda,
      args.prendaId,
      args.reserva.fechaReserva,
      manager,
    );

    await repoTarea.save(
      repoTarea.create({
        tipoTarea: TipoTareaOperativa.LLEVAR_MODISTA,
        estado: EstadoTareaOperativa.PENDIENTE,
        prioridad,
        tipoPrenda: args.tipoPrenda,
        reserva: args.reserva,
        saco:
          args.tipoPrenda === TipoPrenda.SACO
            ? ({ id: args.prendaId } as Saco)
            : null,
        pantalon:
          args.tipoPrenda === TipoPrenda.PANTALON
            ? ({ id: args.prendaId } as Pantalon)
            : null,
        clienteNombre: args.reserva.clienteNombre,
        clienteTelefono: args.reserva.clienteTelefono,
        fechaObjetivoDesde: DateUtils.getTodayDateOnly(),
        fechaObjetivoHasta: null,
        creadoPor: args.usuarioId ? ({ id: args.usuarioId } as User) : null,
        resueltoPor: null,
        metadataJson: {
          reservaId: args.reserva.id,
          motivo: 'Post mediciones registradas',
        },
      }),
    );
  }

  private async obtenerPrioridadPorProximaReservaPrenda(
    tipoPrenda: TipoPrenda,
    prendaId: number,
    fechaBase: string,
    manager?: EntityManager,
  ): Promise<PrioridadTareaOperativa> {
    const repoReserva = manager
      ? manager.getRepository(Reserva)
      : this.reservaRepository;

    const qb = repoReserva
      .createQueryBuilder('reserva')
      .where('reserva.fechaReserva > :fechaBase', { fechaBase })
      .andWhere('reserva.estadoReserva <> :cancelada', {
        cancelada: EstadoReserva.CANCELADA,
      })
      .orderBy('reserva.fechaReserva', 'ASC')
      .limit(1);

    if (tipoPrenda === TipoPrenda.SACO) {
      qb.andWhere('reserva.saco_id = :prendaId', { prendaId });
    } else {
      qb.andWhere('reserva.pantalon_id = :prendaId', { prendaId });
    }

    const proxima = await qb.getOne();
    if (!proxima) {
      return PrioridadTareaOperativa.BAJA;
    }

    const dias = differenceInCalendarDays(
      new Date(`${proxima.fechaReserva}T00:00:00`),
      new Date(`${fechaBase}T00:00:00`),
    );
    return this.calcularPrioridadPorDias(dias);
  }

  private assertPrendaEnTienda(
    ubicacion: EstadoUbicacionPrenda,
    tipoPrenda: TipoPrenda,
  ): void {
    if (ubicacion !== EstadoUbicacionPrenda.TIENDA) {
      const nombre = tipoPrenda === TipoPrenda.SACO ? 'saco' : 'pantalón';
      throw new BadRequestException(
        `No se puede avanzar esta tarea: el ${nombre} no se encuentra físicamente en el local (ubicación actual: ${ubicacion}).`,
      );
    }
  }

  private calcularPrioridadPorDias(dias: number): PrioridadTareaOperativa {
    if (dias <= 7) return PrioridadTareaOperativa.ALTA;
    if (dias <= 15) return PrioridadTareaOperativa.MEDIA;
    return PrioridadTareaOperativa.BAJA;
  }

  private async obtenerTarea(tareaId: number): Promise<TareaOperativa> {
    const tarea = await this.tareaRepository.findOne({
      where: { id: tareaId },
      relations: ['reserva', 'saco', 'pantalon'],
    });
    if (!tarea) throw new NotFoundException('Tarea operativa no encontrada');
    return tarea;
  }

  private async obtenerTareaConManager(
    tareaId: number,
    manager: EntityManager,
  ): Promise<TareaOperativa> {
    const tarea = await manager.getRepository(TareaOperativa).findOne({
      where: { id: tareaId },
      relations: ['reserva', 'saco', 'pantalon'],
    });
    if (!tarea) throw new NotFoundException('Tarea operativa no encontrada');
    return tarea;
  }
}
