import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ControlPreEntrega } from 'src/modules/control-pre-entrega/entity/control-pre-entrega.entity';
import { AgendaMedicion } from 'src/modules/tareas-operativas/entity/agenda-medicion.entity';
import { TareaOperativa } from 'src/modules/tareas-operativas/entity/tarea-operativa.entity';
import { DataSource, Not } from 'typeorm';
import {
  EstadoAgendaMedicion,
  EstadoControlPreEntrega,
  EstadoTareaOperativa,
  TipoTareaOperativa,
  TipoPasoCompletado,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { PasoCompletadoDto } from '../dto/pasos-reserva.dto';
import { MedicionReserva } from '../entity/medicion-reserva.entity';
import { Reserva } from '../entity/reserva.entity';

@Injectable()
export class PasosReservaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async obtenerPasosCompletados(reservaId: number): Promise<PasoCompletadoDto[]> {
    const em = this.dataSource.manager;

    const reserva = await em.findOne(Reserva, { where: { id: reservaId } });
    if (!reserva) throw new NotFoundException('Reserva no encontrada');

    const [tareas, agendas, medicion, control] = await Promise.all([
      em.find(TareaOperativa, {
        where: { reserva: { id: reservaId } as any, estado: Not(EstadoTareaOperativa.CANCELADA) },
      }),
      em.find(AgendaMedicion, {
        where: { reserva: { id: reservaId } as any, estado: Not(EstadoAgendaMedicion.CANCELADA) },
        relations: ['tareaOperativa'],
      }),
      em.findOne(MedicionReserva, { where: { reserva: { id: reservaId } as any } }),
      em.findOne(ControlPreEntrega, {
        where: { reserva: { id: reservaId } as any, estado: Not(EstadoControlPreEntrega.REVERTIDO) },
      }),
    ]);

    const pasos: PasoCompletadoDto[] = [];

    this.procesarTareasContacto(tareas, agendas, medicion, pasos);
    this.procesarTareasLavanderia(tareas, pasos);
    this.procesarTareasModista(tareas, pasos);

    if (control) {
      this.agregarPasoControlPreEntrega(control, pasos);
    }
    if (reserva.clienteRetiroAt) {
      pasos.push({
        id: `RETIRO_CLIENTE-${reservaId}`,
        tipo: TipoPasoCompletado.RETIRO_CLIENTE,
        descripcion: 'Cliente retiró el traje',
        fechaCompletado: new Date(reserva.clienteRetiroAt).toISOString(),
        puedeRevertirse: false,
      });
    }
    if (reserva.clienteDevolvioAt) {
      pasos.push({
        id: `DEVOLUCION_CLIENTE-${reservaId}`,
        tipo: TipoPasoCompletado.DEVOLUCION_CLIENTE,
        descripcion: 'Cliente devolvió el traje',
        fechaCompletado: new Date(reserva.clienteDevolvioAt).toISOString(),
        puedeRevertirse: false,
      });
    }

    pasos.sort((a, b) => new Date(a.fechaCompletado).getTime() - new Date(b.fechaCompletado).getTime());

    this.marcarUltimoPasoRevertible(pasos);

    return pasos;
  }

  private procesarTareasContacto(
    tareas: TareaOperativa[],
    agendas: AgendaMedicion[],
    medicion: MedicionReserva | null,
    pasos: PasoCompletadoDto[],
  ): void {
    const tarea = tareas.find((t) => t.tipoTarea === TipoTareaOperativa.CONTACTAR_MEDICION);
    if (!tarea) return;

    const meta = tarea.metadataJson ?? {};

    if (meta.contactoClienteAt) {
      pasos.push({
        id: `CONTACTO_MEDICION_MARCADO-${tarea.id}`,
        tipo: TipoPasoCompletado.CONTACTO_MEDICION_MARCADO,
        descripcion: 'Contacto con cliente registrado',
        fechaCompletado: meta.contactoClienteAt as string,
        tareaId: tarea.id,
        puedeRevertirse: false,
      });
    }

    for (const agenda of agendas) {
      if (agenda.tareaOperativa?.id !== tarea.id) continue;
      pasos.push({
        id: `MEDICION_PROGRAMADA-${agenda.id}`,
        tipo: TipoPasoCompletado.MEDICION_PROGRAMADA,
        descripcion: `Medición agendada para ${this.formatearFechaHora(agenda.fechaHoraCita)}`,
        fechaCompletado: new Date(agenda.createdAt).toISOString(),
        tareaId: tarea.id,
        agendaId: agenda.id,
        puedeRevertirse: false,
      });
    }

    if (meta.medicionesRegistradasAt && medicion) {
      pasos.push({
        id: `MEDICIONES_REGISTRADAS-${tarea.reserva?.id ?? tarea.id}`,
        tipo: TipoPasoCompletado.MEDICIONES_REGISTRADAS,
        descripcion: 'Mediciones registradas',
        fechaCompletado: meta.medicionesRegistradasAt as string,
        tareaId: tarea.id,
        puedeRevertirse: false,
      });
    }
  }

  private procesarTareasLavanderia(tareas: TareaOperativa[], pasos: PasoCompletadoDto[]): void {
    const tareasLav = tareas.filter((t) => t.tipoTarea === TipoTareaOperativa.LLEVAR_LAVANDERIA);

    for (const tarea of tareasLav) {
      const meta = tarea.metadataJson ?? {};
      const tipoPrenda = tarea.tipoPrenda ?? undefined;
      const sufijo = tipoPrenda ? ` (${this.labelPrenda(tipoPrenda)})` : '';

      if (meta.omitidoLavanderiaAt) {
        pasos.push({
          id: `LAVANDERIA_OMITIDA-${tarea.id}`,
          tipo: TipoPasoCompletado.LAVANDERIA_OMITIDA,
          descripcion: `Lavandería omitida${sufijo}`,
          fechaCompletado: meta.omitidoLavanderiaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
        continue;
      }

      if (meta.enviadoLavanderiaAt) {
        pasos.push({
          id: `ENVIO_LAVANDERIA-${tarea.id}`,
          tipo: TipoPasoCompletado.ENVIO_LAVANDERIA,
          descripcion: `Enviado a lavandería${sufijo}`,
          fechaCompletado: meta.enviadoLavanderiaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
      }

      if (meta.recibidoLavanderiaAt) {
        pasos.push({
          id: `RECEPCION_LAVANDERIA-${tarea.id}`,
          tipo: TipoPasoCompletado.RECEPCION_LAVANDERIA,
          descripcion: `Recibido de lavandería${sufijo}`,
          fechaCompletado: meta.recibidoLavanderiaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
      }
    }
  }

  private procesarTareasModista(tareas: TareaOperativa[], pasos: PasoCompletadoDto[]): void {
    const tareasMod = tareas.filter((t) => t.tipoTarea === TipoTareaOperativa.LLEVAR_MODISTA);

    for (const tarea of tareasMod) {
      const meta = tarea.metadataJson ?? {};
      const tipoPrenda = tarea.tipoPrenda ?? undefined;
      const sufijo = tipoPrenda ? ` (${this.labelPrenda(tipoPrenda)})` : '';

      if (meta.omitidoModistaAt) {
        pasos.push({
          id: `MODISTA_OMITIDA-${tarea.id}`,
          tipo: TipoPasoCompletado.MODISTA_OMITIDA,
          descripcion: `Modista omitida${sufijo}`,
          fechaCompletado: meta.omitidoModistaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
        continue;
      }

      if (meta.enviadoModistaAt) {
        pasos.push({
          id: `ENVIO_MODISTA-${tarea.id}`,
          tipo: TipoPasoCompletado.ENVIO_MODISTA,
          descripcion: `Enviado a modista${sufijo}`,
          fechaCompletado: meta.enviadoModistaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
      }

      if (meta.recibidoModistaAt) {
        pasos.push({
          id: `RECEPCION_MODISTA-${tarea.id}`,
          tipo: TipoPasoCompletado.RECEPCION_MODISTA,
          descripcion: `Recibido de modista${sufijo}`,
          fechaCompletado: meta.recibidoModistaAt as string,
          tipoPrenda,
          tareaId: tarea.id,
          puedeRevertirse: false,
        });
      }
    }
  }

  private agregarPasoControlPreEntrega(control: ControlPreEntrega, pasos: PasoCompletadoDto[]): void {
    const esResuelto = control.estado === EstadoControlPreEntrega.RESUELTO;
    const fecha = esResuelto && control.fechaResolucion
      ? new Date(control.fechaResolucion).toISOString()
      : new Date(control.createdAt).toISOString();

    pasos.push({
      id: `CONTROL_PRE_ENTREGA-${control.id}`,
      tipo: TipoPasoCompletado.CONTROL_PRE_ENTREGA,
      descripcion: esResuelto ? 'Control pre-entrega resuelto' : 'Control pre-entrega aprobado',
      fechaCompletado: fecha,
      puedeRevertirse: false,
    });
  }

  /**
   * Marca como revertibles todos los pasos que comparten el mismo timestamp más reciente.
   * Los pasos simultáneos (p. ej. saco y pantalón enviados en el mismo lote) se revierten juntos.
   */
  private marcarUltimoPasoRevertible(pasos: PasoCompletadoDto[]): void {
    if (pasos.length === 0) return;

    const ultimaFecha = pasos[pasos.length - 1].fechaCompletado;
    const ultimoTs = new Date(ultimaFecha).getTime();

    for (let i = pasos.length - 1; i >= 0; i--) {
      if (new Date(pasos[i].fechaCompletado).getTime() === ultimoTs) {
        pasos[i].puedeRevertirse = true;
      } else {
        break;
      }
    }
  }

  private labelPrenda(tipoPrenda: TipoPrenda): string {
    return tipoPrenda === TipoPrenda.SACO ? 'Saco' : 'Pantalón';
  }

  private formatearFechaHora(fecha: Date): string {
    return fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
