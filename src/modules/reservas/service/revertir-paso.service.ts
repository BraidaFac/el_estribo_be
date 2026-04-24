import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BloqueoPlannerService } from 'src/modules/bloqueos/service/bloqueo-planner.service';
import { BloqueosService } from 'src/modules/bloqueos/service/bloqueos.service';
import { ControlPreEntrega } from 'src/modules/control-pre-entrega/entity/control-pre-entrega.entity';
import {
  EstadoAgendaMedicion,
  EstadoControlPreEntrega,
  EstadoReserva,
  EstadoTareaOperativa,
  EstadoUbicacionPrenda,
  TipoBloqueo,
  TipoPasoCompletado,
  TipoPrenda,
  TipoTareaOperativa,
} from 'src/modules/common/enums/reservas-domain.enums';
import { Lavanderia } from 'src/modules/lavanderias/entity/lavanderia.entity';
import { Modista } from 'src/modules/modistas/entity/modista.entity';
import { OperacionesPrendaService } from 'src/modules/operaciones-prenda/service/operaciones-prenda.service';
import { AgendaMedicion } from 'src/modules/tareas-operativas/entity/agenda-medicion.entity';
import { TareaOperativa } from 'src/modules/tareas-operativas/entity/tarea-operativa.entity';
import { DataSource, EntityManager, Not } from 'typeorm';
import { PasoCompletadoDto, RevertirUltimoPasoDto } from '../dto/pasos-reserva.dto';
import { AsignacionServicioReserva } from '../entity/asignacion-servicio-reserva.entity';
import { MedicionReserva } from '../entity/medicion-reserva.entity';
import { RecepcionDevolucionReserva } from '../entity/recepcion-devolucion-reserva.entity';
import { Reserva } from '../entity/reserva.entity';
import { PasosReservaService } from './pasos-reserva.service';

@Injectable()
export class RevertirPasoService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly pasosReservaService: PasosReservaService,
    private readonly operacionesPrendaService: OperacionesPrendaService,
    private readonly bloqueoPlannerService: BloqueoPlannerService,
    private readonly bloqueosService: BloqueosService,
  ) {}

  async revertirUltimoPaso(
    reservaId: number,
    dto: RevertirUltimoPasoDto,
    usuarioId: string,
  ): Promise<PasoCompletadoDto[]> {
    const pasos = await this.pasosReservaService.obtenerPasosCompletados(reservaId);
    const ultimosPasos = pasos.filter((p) => p.puedeRevertirse);

    if (ultimosPasos.length === 0) {
      throw new BadRequestException('Esta reserva no tiene pasos revertibles');
    }

    const coincide = ultimosPasos.some(
      (p) =>
        p.tipo === dto.tipo &&
        (dto.tareaId === undefined || p.tareaId === dto.tareaId) &&
        (dto.agendaId === undefined || p.agendaId === dto.agendaId),
    );

    if (!coincide) {
      throw new ConflictException(
        'El paso solicitado no es el último paso revertible. El estado puede haber cambiado.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      switch (dto.tipo) {
        case TipoPasoCompletado.DEVOLUCION_CLIENTE:
          await this.revertirDevolucionCliente(reservaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.RETIRO_CLIENTE:
          await this.revertirRetiroCliente(reservaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.CONTROL_PRE_ENTREGA:
          await this.revertirControlPreEntrega(reservaId, dto.motivo, manager);
          break;
        case TipoPasoCompletado.RECEPCION_MODISTA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirRecepcionModista(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.ENVIO_MODISTA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirEnvioModista(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.RECEPCION_LAVANDERIA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirRecepcionLavanderia(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.ENVIO_LAVANDERIA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirEnvioLavanderia(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.MEDICIONES_REGISTRADAS:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirMedicionesRegistradas(reservaId, dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.MEDICION_PROGRAMADA:
          if (!dto.agendaId) throw new BadRequestException('agendaId requerido');
          await this.revertirProgramacionMedicion(dto.agendaId, dto.tareaId, manager);
          break;
        case TipoPasoCompletado.CONTACTO_MEDICION_MARCADO:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirContactoMedicion(dto.tareaId, manager);
          break;
        case TipoPasoCompletado.LAVANDERIA_OMITIDA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirLavanderiaOmitida(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        case TipoPasoCompletado.MODISTA_OMITIDA:
          if (!dto.tareaId) throw new BadRequestException('tareaId requerido');
          await this.revertirModistaOmitida(dto.tareaId, dto.motivo, usuarioId, manager);
          break;
        default:
          throw new BadRequestException(`Tipo de paso no soportado: ${dto.tipo}`);
      }
    });

    return this.pasosReservaService.obtenerPasosCompletados(reservaId);
  }

  // ─── DEVOLUCION CLIENTE ──────────────────────────────────────────────────────

  private async revertirDevolucionCliente(
    reservaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const reserva = await manager.findOne(Reserva, {
      where: { id: reservaId },
      relations: ['saco', 'pantalon'],
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estadoReserva !== EstadoReserva.COMPLETADA) {
      throw new BadRequestException('La reserva no está en estado COMPLETADA');
    }

    // Cancelar solo tareas post-devolución en PENDIENTE (las EN_PROCESO deben revertirse primero)
    const tareasLav = await manager.find(TareaOperativa, {
      where: {
        reserva: { id: reservaId } as any,
        tipoTarea: TipoTareaOperativa.LLEVAR_LAVANDERIA,
        estado: EstadoTareaOperativa.PENDIENTE,
      },
    });
    for (const t of tareasLav) {
      if ((t.metadataJson as any)?.motivo === 'Post devolucion cliente') {
        t.estado = EstadoTareaOperativa.CANCELADA;
        t.metadataJson = {
          ...(t.metadataJson ?? {}),
          revertidoAt: new Date().toISOString(),
          revertidoPor: usuarioId,
          motivoReversion: motivo,
        };
        await manager.getRepository(TareaOperativa).save(t);
      }
    }

    await manager.getRepository(RecepcionDevolucionReserva).delete({
      reserva: { id: reservaId } as any,
    });

    reserva.estadoReserva = EstadoReserva.EN_CURSO;
    reserva.clienteDevolvioAt = null;
    await manager.getRepository(Reserva).save(reserva);

    await this.operacionesPrendaService.actualizarUbicacion(
      TipoPrenda.SACO,
      reserva.saco.id,
      EstadoUbicacionPrenda.RETIRADO_CLIENTE,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
    );
    if (reserva.pantalon) {
      await this.operacionesPrendaService.actualizarUbicacion(
        TipoPrenda.PANTALON,
        reserva.pantalon.id,
        EstadoUbicacionPrenda.RETIRADO_CLIENTE,
        { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
      );
    }
  }

  // ─── RETIRO CLIENTE ──────────────────────────────────────────────────────────

  private async revertirRetiroCliente(
    reservaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const reserva = await manager.findOne(Reserva, {
      where: { id: reservaId },
      relations: ['saco', 'pantalon'],
    });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estadoReserva !== EstadoReserva.EN_CURSO) {
      throw new BadRequestException('La reserva no está en estado EN_CURSO');
    }

    reserva.estadoReserva = EstadoReserva.LISTO_PARA_ENTREGAR;
    reserva.clienteRetiroAt = null;
    await manager.getRepository(Reserva).save(reserva);

    await this.operacionesPrendaService.actualizarUbicacion(
      TipoPrenda.SACO,
      reserva.saco.id,
      EstadoUbicacionPrenda.TIENDA,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
    );
    if (reserva.pantalon) {
      await this.operacionesPrendaService.actualizarUbicacion(
        TipoPrenda.PANTALON,
        reserva.pantalon.id,
        EstadoUbicacionPrenda.TIENDA,
        { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
      );
    }
  }

  // ─── CONTROL PRE-ENTREGA ─────────────────────────────────────────────────────

  private async revertirControlPreEntrega(
    reservaId: number,
    motivo: string,
    manager: EntityManager,
  ): Promise<void> {
    const reserva = await manager.findOne(Reserva, { where: { id: reservaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');
    if (reserva.estadoReserva !== EstadoReserva.LISTO_PARA_ENTREGAR) {
      throw new BadRequestException('La reserva no está en estado LISTO_PARA_ENTREGAR');
    }

    const control = await manager.findOne(ControlPreEntrega, {
      where: {
        reserva: { id: reservaId } as any,
        estado: Not(EstadoControlPreEntrega.REVERTIDO),
      },
    });
    if (!control) throw new NotFoundException('Control pre-entrega no encontrado');

    control.estado = EstadoControlPreEntrega.REVERTIDO;
    await manager.getRepository(ControlPreEntrega).save(control);

    reserva.estadoReserva = EstadoReserva.CONFIRMADA;
    await manager.getRepository(Reserva).save(reserva);
  }

  // ─── RECEPCION MODISTA ───────────────────────────────────────────────────────

  private async revertirRecepcionModista(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['recibidoModistaAt']) {
      throw new BadRequestException('La tarea no tiene registro de recepción de modista');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);

    tarea.estado = EstadoTareaOperativa.EN_PROCESO;
    tarea.costoModista = null;
    tarea.metadataJson = {
      ...meta,
      recibidoModistaAt: undefined,
      costoModistaRegistradoAt: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    await manager.getRepository(TareaOperativa).save(tarea);

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda, prendaId, EstadoUbicacionPrenda.EN_MODISTA,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId: tarea.reserva?.id },
    );

    // Restaurar asignación si se guardó el modistaId en el envío
    const modistaId = meta['modistaId'] as number | undefined;
    if (tarea.reserva?.id && modistaId) {
      await this.patchAsignacion(manager, tarea.reserva.id, tipoPrenda, {
        modista: { id: modistaId } as Modista,
      });
    }
  }

  // ─── ENVIO MODISTA ───────────────────────────────────────────────────────────

  private async revertirEnvioModista(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['enviadoModistaAt']) {
      throw new BadRequestException('La tarea no tiene registro de envío a modista');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);
    const reservaId = tarea.reserva?.id;

    tarea.estado = EstadoTareaOperativa.PENDIENTE;
    tarea.metadataJson = {
      ...meta,
      enviadoModistaAt: undefined,
      modistaId: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    await manager.getRepository(TareaOperativa).save(tarea);

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda, prendaId, EstadoUbicacionPrenda.TIENDA,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
    );

    if (reservaId) {
      await this.patchAsignacion(manager, reservaId, tipoPrenda, { modista: null });
    }
  }

  // ─── RECEPCION LAVANDERIA ─────────────────────────────────────────────────────

  private async revertirRecepcionLavanderia(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['recibidoLavanderiaAt']) {
      throw new BadRequestException('La tarea no tiene registro de recepción de lavandería');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);
    const lavanderiaId = meta['lavanderiaId'] as number | undefined;

    tarea.estado = EstadoTareaOperativa.EN_PROCESO;
    tarea.fechaRetiroLavanderia = null;
    tarea.metadataJson = {
      ...meta,
      recibidoLavanderiaAt: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    if (lavanderiaId) {
      tarea.lavanderia = { id: lavanderiaId } as Lavanderia;
    }
    await manager.getRepository(TareaOperativa).save(tarea);

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda, prendaId, EstadoUbicacionPrenda.EN_LAVANDERIA,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId: tarea.reserva?.id },
    );

    if (tarea.reserva?.id && lavanderiaId) {
      await this.patchAsignacion(manager, tarea.reserva.id, tipoPrenda, {
        lavanderia: { id: lavanderiaId } as Lavanderia,
      });
    }
  }

  // ─── ENVIO LAVANDERIA ─────────────────────────────────────────────────────────

  private async revertirEnvioLavanderia(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['enviadoLavanderiaAt']) {
      throw new BadRequestException('La tarea no tiene registro de envío a lavandería');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);
    const reservaId = tarea.reserva?.id;

    tarea.estado = EstadoTareaOperativa.PENDIENTE;
    tarea.lavanderia = null;
    tarea.fechaIngresoLavanderia = null;
    tarea.metadataJson = {
      ...meta,
      enviadoLavanderiaAt: undefined,
      lavanderiaId: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    await manager.getRepository(TareaOperativa).save(tarea);

    await this.operacionesPrendaService.actualizarUbicacion(
      tipoPrenda, prendaId, EstadoUbicacionPrenda.TIENDA,
      { manager, usuarioId, motivo: `Reversión: ${motivo}`, reservaId },
    );

    if (reservaId) {
      await this.patchAsignacion(manager, reservaId, tipoPrenda, { lavanderia: null });
    }
  }

  // ─── MEDICIONES REGISTRADAS ──────────────────────────────────────────────────

  private async revertirMedicionesRegistradas(
    reservaId: number,
    tareaContactoId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const medicion = await manager.findOne(MedicionReserva, {
      where: { reserva: { id: reservaId } as any },
    });
    if (!medicion) throw new NotFoundException('No hay mediciones registradas para esta reserva');

    const sinModista = medicion.sinModista;

    await manager.getRepository(MedicionReserva).delete({ id: medicion.id });

    // Revertir tarea CONTACTAR_MEDICION a EN_PROCESO
    const tareaContacto = await manager.findOne(TareaOperativa, { where: { id: tareaContactoId } });
    if (tareaContacto) {
      tareaContacto.estado = EstadoTareaOperativa.EN_PROCESO;
      tareaContacto.metadataJson = {
        ...(tareaContacto.metadataJson ?? {}),
        medicionesRegistradasAt: undefined,
        revertidoAt: new Date().toISOString(),
        revertidoPor: usuarioId,
        motivoReversion: motivo,
      };
      await manager.getRepository(TareaOperativa).save(tareaContacto);
    }

    // Revertir agendas auto-marcadas como ASISTIO a PROGRAMADA
    await manager
      .getRepository(AgendaMedicion)
      .createQueryBuilder()
      .update()
      .set({ estado: EstadoAgendaMedicion.PROGRAMADA })
      .where('reserva_id = :reservaId', { reservaId })
      .andWhere('estado = :estado', { estado: EstadoAgendaMedicion.ASISTIO })
      .execute();

    // Cancelar tareas LLEVAR_MODISTA en PENDIENTE generadas por el registro de mediciones
    const tareasModista = await manager.find(TareaOperativa, {
      where: {
        reserva: { id: reservaId } as any,
        tipoTarea: TipoTareaOperativa.LLEVAR_MODISTA,
        estado: EstadoTareaOperativa.PENDIENTE,
      },
      relations: ['saco', 'pantalon'],
    });

    for (const t of tareasModista) {
      const prendaId = t.tipoPrenda === TipoPrenda.SACO ? t.saco?.id : t.pantalon?.id;
      if (prendaId && t.tipoPrenda) {
        await this.bloqueosService.cancelarBloquesModistaActivosPorReservaYPrenda(
          reservaId, t.tipoPrenda, prendaId, usuarioId,
          `Reversión mediciones: ${motivo}`, manager,
        );
      }
      t.estado = EstadoTareaOperativa.CANCELADA;
      t.metadataJson = {
        ...(t.metadataJson ?? {}),
        revertidoAt: new Date().toISOString(),
        revertidoPor: usuarioId,
        motivoReversion: motivo,
      };
      await manager.getRepository(TareaOperativa).save(t);
    }

    // Si fue sinModista: recrear bloqueos MODISTA y MEDICION
    if (sinModista) {
      const reserva = await manager.findOne(Reserva, {
        where: { id: reservaId },
        relations: ['saco', 'pantalon'],
      });
      if (reserva) {
        for (const [tipoPrenda, prendaId] of this.prendaEntries(reserva)) {
          await this.bloqueoPlannerService.recrearBloqueosParaReversion(
            {
              tipoPrenda, prendaId, reservaId,
              fechaReserva: reserva.fechaReserva,
              requiereModista: reserva.requiereModista,
              tiposBloqueo: [TipoBloqueo.MODISTA, TipoBloqueo.MEDICION],
              usuarioId,
            },
            manager,
          );
        }
      }
    }
  }

  // ─── PROGRAMACION MEDICION ───────────────────────────────────────────────────

  private async revertirProgramacionMedicion(
    agendaId: number,
    tareaId: number | undefined,
    manager: EntityManager,
  ): Promise<void> {
    const agenda = await manager.findOne(AgendaMedicion, {
      where: { id: agendaId },
      relations: ['tareaOperativa'],
    });
    if (!agenda) throw new NotFoundException('Agenda de medición no encontrada');
    if (agenda.estado === EstadoAgendaMedicion.ASISTIO) {
      throw new BadRequestException(
        'La cita ya fue marcada como asistida. Revertí primero el registro de mediciones.',
      );
    }

    agenda.estado = EstadoAgendaMedicion.CANCELADA;
    await manager.getRepository(AgendaMedicion).save(agenda);

    const efectiveTareaId = agenda.tareaOperativa?.id ?? tareaId;
    if (efectiveTareaId) {
      const tarea = await manager.findOne(TareaOperativa, { where: { id: efectiveTareaId } });
      if (tarea) {
        tarea.metadataJson = {
          ...(tarea.metadataJson ?? {}),
          agendaMedicionId: undefined,
          fechaHoraCitaAgendada: undefined,
        };
        await manager.getRepository(TareaOperativa).save(tarea);
      }
    }
  }

  // ─── CONTACTO MEDICION ───────────────────────────────────────────────────────

  private async revertirContactoMedicion(
    tareaId: number,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await manager.findOne(TareaOperativa, { where: { id: tareaId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    if (!tarea.metadataJson?.['contactoClienteAt']) {
      throw new BadRequestException('La tarea no tiene registro de contacto con cliente');
    }

    tarea.estado = EstadoTareaOperativa.PENDIENTE;
    tarea.metadataJson = {
      ...(tarea.metadataJson ?? {}),
      yaHablado: false,
      contactoClienteAt: undefined,
    };
    await manager.getRepository(TareaOperativa).save(tarea);
  }

  // ─── LAVANDERIA OMITIDA ──────────────────────────────────────────────────────

  private async revertirLavanderiaOmitida(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['omitidoLavanderiaAt']) {
      throw new BadRequestException('La tarea no tiene registro de omisión de lavandería');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);
    const reservaId = tarea.reserva?.id;
    if (!reservaId) throw new BadRequestException('La tarea no tiene reserva asociada');

    tarea.estado = EstadoTareaOperativa.PENDIENTE;
    tarea.metadataJson = {
      ...meta,
      omitidoLavanderia: false,
      omitidoLavanderiaAt: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    await manager.getRepository(TareaOperativa).save(tarea);

    const reserva = await manager.findOne(Reserva, { where: { id: reservaId } });
    if (reserva) {
      await this.bloqueoPlannerService.recrearBloqueosParaReversion(
        {
          tipoPrenda, prendaId, reservaId,
          fechaReserva: reserva.fechaReserva,
          requiereModista: reserva.requiereModista,
          tiposBloqueo: [TipoBloqueo.LAVANDERIA],
          usuarioId,
        },
        manager,
      );
    }
  }

  // ─── MODISTA OMITIDA ─────────────────────────────────────────────────────────

  private async revertirModistaOmitida(
    tareaId: number,
    motivo: string,
    usuarioId: string,
    manager: EntityManager,
  ): Promise<void> {
    const tarea = await this.cargarTarea(tareaId, manager);
    const meta = tarea.metadataJson as Record<string, unknown> | null ?? {};

    if (!meta['omitidoModistaAt']) {
      throw new BadRequestException('La tarea no tiene registro de omisión de modista');
    }

    const { prendaId, tipoPrenda } = this.extraerPrenda(tarea);
    const reservaId = tarea.reserva?.id;
    if (!reservaId) throw new BadRequestException('La tarea no tiene reserva asociada');

    tarea.estado = EstadoTareaOperativa.PENDIENTE;
    tarea.metadataJson = {
      ...meta,
      omitidoModista: false,
      omitidoModistaAt: undefined,
      revertidoAt: new Date().toISOString(),
      revertidoPor: usuarioId,
      motivoReversion: motivo,
    };
    await manager.getRepository(TareaOperativa).save(tarea);

    const reserva = await manager.findOne(Reserva, { where: { id: reservaId } });
    if (reserva) {
      await this.bloqueoPlannerService.recrearBloqueosParaReversion(
        {
          tipoPrenda, prendaId, reservaId,
          fechaReserva: reserva.fechaReserva,
          requiereModista: reserva.requiereModista,
          tiposBloqueo: [TipoBloqueo.MODISTA, TipoBloqueo.MEDICION],
          usuarioId,
        },
        manager,
      );
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────

  private async cargarTarea(tareaId: number, manager: EntityManager): Promise<TareaOperativa> {
    const tarea = await manager.findOne(TareaOperativa, {
      where: { id: tareaId },
      relations: ['saco', 'pantalon', 'reserva'],
    });
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    return tarea;
  }

  private extraerPrenda(tarea: TareaOperativa): { prendaId: number; tipoPrenda: TipoPrenda } {
    const tipoPrenda = tarea.tipoPrenda;
    const prendaId = tipoPrenda === TipoPrenda.SACO ? tarea.saco?.id : tarea.pantalon?.id;
    if (!tipoPrenda || !prendaId) {
      throw new BadRequestException('La tarea no tiene prenda asociada');
    }
    return { prendaId, tipoPrenda };
  }

  private prendaEntries(reserva: Reserva): [TipoPrenda, number][] {
    const entries: [TipoPrenda, number][] = [[TipoPrenda.SACO, reserva.saco.id]];
    if (reserva.pantalon) entries.push([TipoPrenda.PANTALON, reserva.pantalon.id]);
    return entries;
  }

  private async patchAsignacion(
    manager: EntityManager,
    reservaId: number,
    tipoPrenda: TipoPrenda,
    patch: { lavanderia?: Lavanderia | null; modista?: Modista | null },
  ): Promise<void> {
    const repo = manager.getRepository(AsignacionServicioReserva);
    let row = await repo.findOne({ where: { reserva: { id: reservaId }, tipoPrenda } });
    if (!row) {
      row = repo.create({
        reserva: { id: reservaId } as Reserva,
        tipoPrenda,
        lavanderia: null,
        modista: null,
      });
    }
    if (patch.lavanderia !== undefined) row.lavanderia = patch.lavanderia;
    if (patch.modista !== undefined) row.modista = patch.modista;
    await repo.save(row);
  }
}
