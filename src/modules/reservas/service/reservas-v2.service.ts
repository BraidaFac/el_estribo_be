import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { subDays } from 'date-fns';
import { BloqueoPrendaEvento } from 'src/modules/bloqueos/entity/bloqueo-prenda-evento.entity';
import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';
import {
  BloqueoPlannerService,
  RangoPlanificado,
} from 'src/modules/bloqueos/service/bloqueo-planner.service';
import {
  EstadoBloqueo,
  EstadoReserva,
  EstadoUbicacionPrenda,
  TipoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { ConfiguracionGeneralService } from 'src/modules/configuracion-general/service/configuracion-general.service';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Modista } from 'src/modules/modistas/entity/modista.entity';
import { OperacionesPrendaService } from 'src/modules/operaciones-prenda/service/operaciones-prenda.service';
import { Pantalon } from 'src/modules/pantalones/entity/pantalon.entity';
import { Saco } from 'src/modules/sacos/entity/saco.entity';
import { TareasOperativasService } from 'src/modules/tareas-operativas/service/tareas-operativas.service';
import { DateUtils } from 'src/utils/date_utils';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ActualizarReservaV2Dto } from '../dto/actualizar-reserva-v2.dto';
import { CreateReservaV2Dto } from '../dto/create-reserva-v2.dto';
import { ValidarReservaV2Dto } from '../dto/validar-reserva-v2.dto';
import { AsignacionServicioReserva } from '../entity/asignacion-servicio-reserva.entity';
import { Reserva } from '../entity/reserva.entity';
import { DisponibilidadService } from './disponibilidad.service';

type AccionPermitida = {
  permitida: boolean;
  motivo: string | null;
};

type ReservaAccionesPermitidas = {
  editar: AccionPermitida;
  cancelar: AccionPermitida;
  retirar: AccionPermitida;
  devolver: AccionPermitida;
};

export type ReservaConAcciones = Reserva & {
  accionesPermitidas: ReservaAccionesPermitidas;
};

@Injectable()
export class ReservasV2Service {
  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectRepository(Saco)
    private readonly sacoRepository: Repository<Saco>,
    @InjectRepository(BloqueoPrendaEvento)
    private readonly bloqueoEventoRepository: Repository<BloqueoPrendaEvento>,
    @InjectRepository(Pantalon)
    private readonly pantalonRepository: Repository<Pantalon>,
    @InjectRepository(Lavanderia)
    private readonly lavanderiaRepository: Repository<Lavanderia>,
    @InjectRepository(Modista)
    private readonly modistaRepository: Repository<Modista>,
    @InjectRepository(AsignacionServicioReserva)
    private readonly asignacionServicioRepository: Repository<AsignacionServicioReserva>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly disponibilidadService: DisponibilidadService,
    private readonly configuracionGeneralService: ConfiguracionGeneralService,
    private readonly bloqueoPlannerService: BloqueoPlannerService,
    private readonly operacionesPrendaService: OperacionesPrendaService,
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  async validarPreConfirmacion(input: ValidarReservaV2Dto): Promise<void> {
    const fechaReserva = DateUtils.normalizeDateOnly(input.fechaReserva);
    if (!fechaReserva) {
      throw new BadRequestException(
        'fechaReserva debe tener formato yyyy-MM-dd',
      );
    }
    this.assertFechaReservaNoPasada(fechaReserva);

    const sacoId = Number(input.sacoId);
    const pantalonId = input.pantalonId ? Number(input.pantalonId) : null;
    if (!input.sacoId) {
      throw new BadRequestException('El saco es obligatorio para reservar');
    }
    if (!Number.isInteger(sacoId) || sacoId <= 0) {
      throw new BadRequestException('sacoId invalido');
    }
    if (
      pantalonId !== null &&
      (!Number.isInteger(pantalonId) || pantalonId <= 0)
    ) {
      throw new BadRequestException('pantalonId invalido');
    }
    const requiereModista = input.requiereModista ?? true;

    await this.validarConflictosPreReserva(
      {
        sacoId,
        pantalonId,
        fechaReserva,
        requiereModista,
      },
      undefined,
      false,
    );
  }

  async crearReserva(
    dto: CreateReservaV2Dto,
    userId?: string,
  ): Promise<ReservaConAcciones> {
    const fechaReserva = DateUtils.normalizeDateOnly(dto.fechaReserva);
    if (!fechaReserva) {
      throw new BadRequestException(
        'fechaReserva debe tener formato yyyy-MM-dd',
      );
    }
    this.assertFechaReservaNoPasada(fechaReserva);
    const sacoId = Number(dto.sacoId);
    const pantalonId = dto.pantalonId ? Number(dto.pantalonId) : null;
    if (!Number.isInteger(sacoId) || sacoId <= 0) {
      throw new BadRequestException('sacoId invalido');
    }
    if (
      pantalonId !== null &&
      (!Number.isInteger(pantalonId) || pantalonId <= 0)
    ) {
      throw new BadRequestException('pantalonId invalido');
    }
    const requiereModista = dto.requiereModista ?? true;

    return this.dataSource.transaction(async (manager) => {
      await this.bloquearPrendaEnTransaccion(manager, TipoPrenda.SACO, sacoId);
      if (pantalonId) {
        await this.bloquearPrendaEnTransaccion(
          manager,
          TipoPrenda.PANTALON,
          pantalonId,
        );
      }

      await this.validarConflictosPreReserva(
        {
          sacoId,
          pantalonId,
          fechaReserva,
          requiereModista,
        },
        manager,
        true,
      );

      const [saco, pantalon, config] = await Promise.all([
        this.obtenerSacoActivo(sacoId, manager),
        pantalonId
          ? this.obtenerPantalonActivo(pantalonId, manager)
          : Promise.resolve(null),
        this.configuracionGeneralService.obtener(),
      ]);

      const reserva = manager.getRepository(Reserva).create({
        fechaReserva,
        estadoReserva: EstadoReserva.CONFIRMADA,
        saco,
        pantalon,
        clienteDni: dto.clienteDni.trim(),
        clienteNombre: dto.clienteNombre.trim(),
        nombreCuenta: dto.nombreCuenta?.trim() ?? null,
        clienteTelefono: dto.clienteTelefono?.trim() ?? null,
        observaciones: dto.observaciones?.trim() ?? null,
        requiereModista,
        diasModistaAplicados: config.diasModista,
        diasLavanderiaAplicados: config.diasLavanderia,
        diasTomarMedicionesAplicados: config.diasTomarMediciones,
        clienteRetiroAt: null,
        clienteDevolvioAt: null,
      });

      const reservaGuardada = await manager
        .getRepository(Reserva)
        .save(reserva);
      await this.bloqueoPlannerService.planificarBloqueosDerivados(
        {
          reservaId: reservaGuardada.id,
          fechaReserva,
          sacoId: saco.id,
          pantalonId: pantalon?.id ?? null,
          modistaId: null,
          lavanderiaId: null,
          requiereModista,
          creadoPor: userId ?? null,
        },
        manager,
      );

      const reservaFinal = await manager.getRepository(Reserva).findOneOrFail({
        where: { id: reservaGuardada.id },
        relations: [
          'saco',
          'pantalon',
          'bloqueos',
          'asignacionesServicio',
          'asignacionesServicio.lavanderia',
          'asignacionesServicio.modista',
        ],
      });
      return this.enriquecerReserva(reservaFinal);
    });
  }

  async disponibilidadSaco(
    sacoId: number,
    desde: string,
    hasta: string,
  ): Promise<{ disponible: boolean; bloqueos: number }> {
    const hasConflict = await this.disponibilidadService.existeSolapamiento(
      TipoPrenda.SACO,
      sacoId,
      desde,
      hasta,
    );
    const bloqueos = await this.disponibilidadService.obtenerBloqueosActivos(
      TipoPrenda.SACO,
      sacoId,
      desde,
      hasta,
    );
    return {
      disponible: !hasConflict,
      bloqueos: bloqueos.length,
    };
  }

  async listarPorRango(
    desde: string,
    hasta: string,
    sacoIdRaw?: string,
  ): Promise<ReservaConAcciones[]> {
    const desdeNormalizada = DateUtils.normalizeDateOnly(desde);
    if (!desdeNormalizada) {
      throw new BadRequestException('desde debe tener formato yyyy-MM-dd');
    }

    const hastaNormalizada = DateUtils.normalizeDateOnly(hasta);
    if (!hastaNormalizada) {
      throw new BadRequestException('hasta debe tener formato yyyy-MM-dd');
    }

    if (desdeNormalizada > hastaNormalizada) {
      throw new BadRequestException('desde no puede ser mayor a hasta');
    }

    const qb = this.reservaRepository
      .createQueryBuilder('reserva')
      .leftJoinAndSelect('reserva.saco', 'saco')
      .leftJoinAndSelect('reserva.pantalon', 'pantalon')
      .where('reserva.fechaReserva BETWEEN :desde AND :hasta', {
        desde: desdeNormalizada,
        hasta: hastaNormalizada,
      })
      .andWhere('reserva.estadoReserva <> :estadoCancelada', {
        estadoCancelada: EstadoReserva.CANCELADA,
      })
      .orderBy('reserva.fechaReserva', 'ASC')
      .addOrderBy('reserva.id', 'ASC');

    if (sacoIdRaw !== undefined && sacoIdRaw !== null && sacoIdRaw !== '') {
      const sacoId = Number(sacoIdRaw);
      if (!Number.isInteger(sacoId) || sacoId <= 0) {
        throw new BadRequestException('sacoId invalido');
      }
      qb.andWhere('saco.id = :sacoId', { sacoId });
    }

    const reservas = await qb.getMany();
    await this.adjuntarAsignacionesServicioAReservas(reservas);
    return Promise.all(
      reservas.map(async (reserva) => await this.enriquecerReserva(reserva)),
    );
  }

  async actualizarReserva(
    reservaId: number,
    dto: ActualizarReservaV2Dto,
  ): Promise<ReservaConAcciones> {
    return this.dataSource.transaction(async (manager) => {
      const reserva = await this.obtenerReserva(reservaId, manager);
      if (reserva.estadoReserva === EstadoReserva.CANCELADA) {
        throw new BadRequestException(
          'No se puede editar una reserva cancelada',
        );
      }

      if (dto.clienteNombre !== undefined) {
        reserva.clienteNombre = dto.clienteNombre.trim();
      }
      if (dto.clienteDni !== undefined) {
        reserva.clienteDni = dto.clienteDni.trim();
      }
      if (dto.clienteTelefono !== undefined) {
        reserva.clienteTelefono = dto.clienteTelefono?.trim() || null;
      }
      if (dto.nombreCuenta !== undefined) {
        reserva.nombreCuenta = dto.nombreCuenta?.trim() || null;
      }
      if (dto.observaciones !== undefined) {
        reserva.observaciones = dto.observaciones?.trim() || null;
      }
      await manager.getRepository(Reserva).save(reserva);
      const reservaActualizada = await this.obtenerReserva(reservaId, manager);
      return this.enriquecerReserva(reservaActualizada);
    });
  }

  async marcarRetiradaCliente(
    reservaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<ReservaConAcciones> {
    return this.dataSource.transaction(async (manager) => {
      const reserva = await this.obtenerReserva(reservaId, manager);
      this.assertPuedeRetirar(reserva);

      reserva.estadoReserva = EstadoReserva.EN_CURSO;
      reserva.clienteRetiroAt = DateUtils.getTodayDateOnly();
      await manager.getRepository(Reserva).save(reserva);

      await this.operacionesPrendaService.actualizarUbicacion(
        TipoPrenda.SACO,
        reserva.saco.id,
        EstadoUbicacionPrenda.RETIRADO_CLIENTE,
        {
          manager,
          usuarioId: usuarioId ?? null,
          motivo: motivo ?? 'Cliente retiro traje',
          reservaId,
        },
      );

      if (reserva.pantalon) {
        await this.operacionesPrendaService.actualizarUbicacion(
          TipoPrenda.PANTALON,
          reserva.pantalon.id,
          EstadoUbicacionPrenda.RETIRADO_CLIENTE,
          {
            manager,
            usuarioId: usuarioId ?? null,
            motivo: motivo ?? 'Cliente retiro traje',
            reservaId,
          },
        );
      }

      const reservaActualizada = await this.obtenerReserva(reservaId, manager);
      return this.enriquecerReserva(reservaActualizada);
    });
  }

  async marcarDevolucionCliente(
    reservaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<ReservaConAcciones> {
    return this.dataSource.transaction(async (manager) => {
      const reserva = await this.obtenerReserva(reservaId, manager);
      this.assertPuedeDevolver(reserva);

      reserva.estadoReserva = EstadoReserva.COMPLETADA;
      reserva.clienteDevolvioAt = DateUtils.getTodayDateOnly();
      await manager.getRepository(Reserva).save(reserva);

      await this.operacionesPrendaService.actualizarUbicacion(
        TipoPrenda.SACO,
        reserva.saco.id,
        EstadoUbicacionPrenda.TIENDA,
        {
          manager,
          usuarioId: usuarioId ?? null,
          motivo: motivo ?? 'Cliente devolvio traje',
          reservaId,
        },
      );
      if (reserva.pantalon) {
        await this.operacionesPrendaService.actualizarUbicacion(
          TipoPrenda.PANTALON,
          reserva.pantalon.id,
          EstadoUbicacionPrenda.TIENDA,
          {
            manager,
            usuarioId: usuarioId ?? null,
            motivo: motivo ?? 'Cliente devolvio traje',
            reservaId,
          },
        );
      }

      await this.tareasOperativasService.crearTareasLavanderiaPostDevolucion(
        reservaId,
        usuarioId,
        manager,
      );

      const reservaActualizada = await this.obtenerReserva(reservaId, manager);
      return this.enriquecerReserva(reservaActualizada);
    });
  }

  async cancelarReserva(
    reservaId: number,
    usuarioId?: string,
    motivo?: string,
  ): Promise<ReservaConAcciones> {
    return this.dataSource.transaction(async (manager) => {
      const reserva = await this.obtenerReserva(reservaId, manager);
      this.assertPuedeCancelar(reserva);

      reserva.estadoReserva = EstadoReserva.CANCELADA;
      await manager.getRepository(Reserva).save(reserva);

      await this.cancelarBloqueosActivosDeReserva(
        reservaId,
        manager,
        usuarioId,
        motivo,
      );

      const reservaActualizada = await this.obtenerReserva(reservaId, manager);
      return this.enriquecerReserva(reservaActualizada);
    });
  }

  async pantalonesDisponibles(fecha: string): Promise<Pantalon[]> {
    const normalized = DateUtils.normalizeDateOnly(fecha);
    if (!normalized) {
      throw new BadRequestException('fecha debe tener formato yyyy-MM-dd');
    }
    const pantalones = await this.pantalonRepository.find({
      where: { activo: true },
      order: { codigo: 'ASC' },
    });
    const resultado: Pantalon[] = [];
    for (const pantalon of pantalones) {
      const bloqueado = await this.disponibilidadService.existeSolapamiento(
        TipoPrenda.PANTALON,
        pantalon.id,
        normalized,
        normalized,
      );
      if (!bloqueado) {
        console.log('pantalon no bloqueado', pantalon.id, normalized);
        resultado.push(pantalon);
      }
    }
    return resultado;
  }

  private async validarConflictosPreReserva(
    args: {
      sacoId: number;
      pantalonId: number | null;
      fechaReserva: string;
      requiereModista: boolean;
    },
    manager?: EntityManager,
    lockForUpdate = false,
  ): Promise<void> {
    const rangos = await this.bloqueoPlannerService.obtenerRangosPlanificados(
      args.fechaReserva,
      args.requiereModista,
    );
    this.assertVentanaBloqueosRespetanHoy(rangos);
    const rangosConsulta = rangos.map((rango) => ({
      inicio: rango.inicio,
      fin: rango.fin,
    }));

    const sacoBloqueado =
      await this.disponibilidadService.existeSolapamientoEnRangos(
        TipoPrenda.SACO,
        args.sacoId,
        rangosConsulta,
        { manager, lockForUpdate },
      );
    if (sacoBloqueado) {
      throw new BadRequestException(
        'El saco no se encuentra disponible en la ventana de bloqueos requerida',
      );
    }

    if (!args.pantalonId) {
      return;
    }

    const pantalonBloqueado =
      await this.disponibilidadService.existeSolapamientoEnRangos(
        TipoPrenda.PANTALON,
        args.pantalonId,
        rangosConsulta,
        { manager, lockForUpdate },
      );
    if (pantalonBloqueado) {
      throw new BadRequestException(
        'El pantalon no se encuentra disponible en la ventana de bloqueos requerida',
      );
    }
  }

  private async bloquearPrendaEnTransaccion(
    manager: EntityManager,
    tipoPrenda: TipoPrenda,
    prendaId: number,
  ): Promise<void> {
    if (tipoPrenda === TipoPrenda.SACO) {
      await manager
        .getRepository(Saco)
        .createQueryBuilder('saco')
        .setLock('pessimistic_write')
        .where('saco.id = :id', { id: prendaId })
        .getOne();
      return;
    }

    await manager
      .getRepository(Pantalon)
      .createQueryBuilder('pantalon')
      .setLock('pessimistic_write')
      .where('pantalon.id = :id', { id: prendaId })
      .getOne();
  }

  private async obtenerSacoActivo(
    id: number,
    manager?: EntityManager,
  ): Promise<Saco> {
    const repo = manager ? manager.getRepository(Saco) : this.sacoRepository;
    const saco = await repo.findOne({
      where: { id, activo: true },
    });
    if (!saco) throw new NotFoundException('Saco no encontrado');
    return saco;
  }

  private async obtenerPantalonActivo(
    id: number,
    manager?: EntityManager,
  ): Promise<Pantalon> {
    const repo = manager
      ? manager.getRepository(Pantalon)
      : this.pantalonRepository;
    const pantalon = await repo.findOne({
      where: { id, activo: true },
    });
    if (!pantalon) throw new NotFoundException('Pantalon no encontrado');
    return pantalon;
  }

  private async obtenerLavanderiaActiva(
    id: number,
    manager?: EntityManager,
  ): Promise<Lavanderia> {
    const repo = manager
      ? manager.getRepository(Lavanderia)
      : this.lavanderiaRepository;
    const lavanderia = await repo.findOne({
      where: { id, activo: true },
    });
    if (!lavanderia) throw new NotFoundException('Lavanderia no encontrada');
    return lavanderia;
  }

  private async obtenerModistaActiva(
    id: number,
    manager?: EntityManager,
  ): Promise<Modista> {
    const repo = manager
      ? manager.getRepository(Modista)
      : this.modistaRepository;
    const modista = await repo.findOne({
      where: { id, activo: true },
    });
    if (!modista) throw new NotFoundException('Modista no encontrada');
    return modista;
  }

  private async adjuntarAsignacionesServicioAReservas(
    reservas: Reserva[],
    manager?: EntityManager,
  ): Promise<void> {
    const ids = reservas.map((r) => r.id);
    if (ids.length === 0) return;
    const repo = manager
      ? manager.getRepository(AsignacionServicioReserva)
      : this.asignacionServicioRepository;
    const rows = await repo.find({
      where: { reserva: { id: In(ids) } },
      relations: ['lavanderia', 'modista', 'reserva'],
    });
    const map = new Map<number, AsignacionServicioReserva[]>();
    for (const row of rows) {
      const rid = row.reserva.id;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(row);
    }
    for (const r of reservas) {
      r.asignacionesServicio = map.get(r.id) ?? [];
    }
  }

  private async obtenerReserva(
    id: number,
    manager?: EntityManager,
  ): Promise<Reserva> {
    const repo = manager
      ? manager.getRepository(Reserva)
      : this.reservaRepository;
    const reserva = await repo.findOne({
      where: { id },
      relations: [
        'saco',
        'pantalon',
        'bloqueos',
        'asignacionesServicio',
        'asignacionesServicio.lavanderia',
        'asignacionesServicio.modista',
      ],
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return reserva;
  }

  private async cancelarBloqueosActivosDeReserva(
    reservaId: number,
    manager: EntityManager,
    usuarioId?: string,
    motivo?: string,
  ): Promise<void> {
    const bloqueosActivos = await manager
      .getRepository(BloqueoPrenda)
      .createQueryBuilder('bloqueo')
      .where('bloqueo.reserva_id = :reservaId', { reservaId })
      .andWhere('bloqueo.estado = :estado', { estado: EstadoBloqueo.ACTIVO })
      .getMany();

    if (bloqueosActivos.length === 0) {
      return;
    }

    const now = new Date();
    const motivoFinal = motivo ?? 'Cancelacion de reserva';
    const userFinal = usuarioId ?? null;

    await manager
      .getRepository(BloqueoPrenda)
      .createQueryBuilder()
      .update(BloqueoPrenda)
      .set({
        estado: EstadoBloqueo.CANCELADO,
        canceladoPor: userFinal,
        canceladoAt: now,
        motivoCancelacion: motivoFinal,
      })
      .where('reserva_id = :reservaId', { reservaId })
      .andWhere('estado = :estado', { estado: EstadoBloqueo.ACTIVO })
      .execute();

    const eventos = bloqueosActivos.map((bloqueo) =>
      this.bloqueoEventoRepository.create({
        bloqueo: { id: bloqueo.id } as BloqueoPrenda,
        evento: 'CANCELADO_POR_RESERVA',
        usuarioId: userFinal,
        payloadJson: {
          reservaId,
          motivoCancelacion: motivoFinal,
        },
      }),
    );
    await manager.getRepository(BloqueoPrendaEvento).save(eventos);
  }

  private enrichAccionPermitida(
    permitida: boolean,
    motivo: string | null = null,
  ): AccionPermitida {
    return {
      permitida,
      motivo: permitida ? null : motivo,
    };
  }

  private async buildAccionesPermitidas(
    reserva: Reserva,
  ): Promise<ReservaAccionesPermitidas> {
    const puedeEditar = reserva.estadoReserva !== EstadoReserva.CANCELADA;
    const puedeCancelar = reserva.estadoReserva === EstadoReserva.CONFIRMADA;
    const ubicacionInvalidaRetiro = this.getMotivoUbicacionRetiro(reserva);
    const fueraVentanaRetiro = await this.getMotivoVentanaRetiro(reserva);
    const puedeRetirar =
      reserva.estadoReserva === EstadoReserva.CONFIRMADA &&
      ubicacionInvalidaRetiro === null &&
      fueraVentanaRetiro === null;
    const motivoVentanaDevolucion = this.getMotivoVentanaDevolucion(reserva);
    const puedeDevolver =
      reserva.estadoReserva === EstadoReserva.EN_CURSO &&
      motivoVentanaDevolucion === null;

    return {
      editar: this.enrichAccionPermitida(
        puedeEditar,
        'No se puede editar una reserva cancelada',
      ),
      cancelar: this.enrichAccionPermitida(
        puedeCancelar,
        'Solo se pueden cancelar reservas confirmadas',
      ),
      retirar: this.enrichAccionPermitida(
        puedeRetirar,
        reserva.estadoReserva !== EstadoReserva.CONFIRMADA
          ? 'Solo se pueden retirar reservas confirmadas'
          : (fueraVentanaRetiro ?? ubicacionInvalidaRetiro),
      ),
      devolver: this.enrichAccionPermitida(
        puedeDevolver,
        reserva.estadoReserva !== EstadoReserva.EN_CURSO
          ? 'Solo se pueden devolver reservas en curso'
          : motivoVentanaDevolucion,
      ),
    };
  }

  private async enriquecerReserva(
    reserva: Reserva,
  ): Promise<ReservaConAcciones> {
    return {
      ...reserva,
      accionesPermitidas: await this.buildAccionesPermitidas(reserva),
    };
  }

  private assertPuedeCancelar(reserva: Reserva): void {
    if (reserva.estadoReserva !== EstadoReserva.CONFIRMADA) {
      throw new BadRequestException(
        'Solo se pueden cancelar reservas confirmadas',
      );
    }
  }

  private async assertPuedeRetirar(reserva: Reserva): Promise<void> {
    if (reserva.estadoReserva !== EstadoReserva.CONFIRMADA) {
      throw new BadRequestException(
        'Solo se pueden retirar reservas confirmadas',
      );
    }
    const motivoVentana = await this.getMotivoVentanaRetiro(reserva);
    if (motivoVentana) {
      throw new BadRequestException(motivoVentana);
    }
    const motivo = this.getMotivoUbicacionRetiro(reserva);
    if (motivo) {
      throw new BadRequestException(motivo);
    }
  }

  private assertPuedeDevolver(reserva: Reserva): void {
    if (reserva.estadoReserva !== EstadoReserva.EN_CURSO) {
      throw new BadRequestException(
        'Solo se pueden devolver reservas en curso',
      );
    }
    const motivoVentana = this.getMotivoVentanaDevolucion(reserva);
    if (motivoVentana) {
      throw new BadRequestException(motivoVentana);
    }
  }

  /** No devolver antes del día de fecha_reserva; el día de la reserva sí aplica. */
  private getMotivoVentanaDevolucion(reserva: Reserva): string | null {
    const fechaReserva = DateUtils.toDateOnly(reserva.fechaReserva);
    if (!fechaReserva) {
      return 'La fecha de reserva es invalida';
    }
    const fechaReservaStr = DateUtils.formatDateOnly(fechaReserva);
    const hoy = DateUtils.getTodayDateOnly();
    if (hoy < fechaReservaStr) {
      return `No se puede devolver antes del dia de la reserva (${fechaReservaStr})`;
    }
    return null;
  }

  private getMotivoUbicacionRetiro(reserva: Reserva): string | null {
    if (reserva.saco.ubicacionActual !== EstadoUbicacionPrenda.TIENDA) {
      return `No se puede retirar: el saco ${reserva.saco.codigo} no esta en tienda`;
    }
    if (
      reserva.pantalon &&
      reserva.pantalon.ubicacionActual !== EstadoUbicacionPrenda.TIENDA
    ) {
      return `No se puede retirar: el pantalon ${reserva.pantalon.codigo} no esta en tienda`;
    }
    return null;
  }

  private async getMotivoVentanaRetiro(
    reserva: Reserva,
  ): Promise<string | null> {
    const fechaReserva = DateUtils.toDateOnly(reserva.fechaReserva);
    if (!fechaReserva) {
      return 'La fecha de reserva es invalida';
    }
    const configuracion = await this.configuracionGeneralService.obtener();
    const limiteRetiro = DateUtils.formatDateOnly(
      subDays(fechaReserva, configuracion.cantidadDiasPermitidoRetiro),
    );
    const hoy = DateUtils.getTodayDateOnly();
    if (hoy < limiteRetiro) {
      return `No se puede retirar antes de ${limiteRetiro} (dos dias antes de la reserva)`;
    }
    return null;
  }

  private assertFechaReservaNoPasada(fechaReserva: string): void {
    const hoy = DateUtils.getTodayDateOnly();
    if (fechaReserva < hoy) {
      throw new BadRequestException(
        'No se pueden crear reservas en fechas anteriores al dia de hoy',
      );
    }
  }

  /**
   * Rechaza la reserva si algún bloqueo tentativo (misma lógica que el planner)
   * caería antes del día actual. Los rangos ya usan días hábiles (sin domingos ni feriados).
   */
  private assertVentanaBloqueosRespetanHoy(rangos: RangoPlanificado[]): void {
    const hoy = DateUtils.getTodayDateOnly();
    for (const rango of rangos) {
      const earliest = rango.inicio <= rango.fin ? rango.inicio : rango.fin;
      if (earliest < hoy) {
        throw new BadRequestException(
          `La fecha de reserva no es factible: el bloqueo de ${this.labelTipoBloqueoPlano(
            rango.tipoBloqueo,
          )} requeriria fechas anteriores al dia de hoy (${hoy}).`,
        );
      }
    }
  }

  private labelTipoBloqueoPlano(tipo: TipoBloqueo): string {
    const map: Record<TipoBloqueo, string> = {
      [TipoBloqueo.MEDICION]: 'medición',
      [TipoBloqueo.MODISTA]: 'modista',
      [TipoBloqueo.LISTO_TIENDA]: 'listo en tienda',
      [TipoBloqueo.RESERVA]: 'reserva',
      [TipoBloqueo.LAVANDERIA]: 'lavandería',
      [TipoBloqueo.MANTENIMIENTO]: 'mantenimiento',
      [TipoBloqueo.MANUAL]: 'manual',
    };
    return map[tipo] ?? tipo;
  }
}
