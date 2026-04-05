import { PrioridadTareaOperativa } from 'src/modules/common/enums/reservas-domain.enums';
import { AgendaMedicion } from 'src/modules/tareas-operativas/entity/agenda-medicion.entity';
import { TareaOperativa } from 'src/modules/tareas-operativas/entity/tarea-operativa.entity';
import { Reserva } from '../entity/reserva.entity';

export type DashboardUrgencia =
  | 'VENCIDA'
  | 'HOY'
  | 'PROXIMA'
  | 'FUTURA'
  | 'SIN_FECHA';

export type DashboardCategoria =
  | 'llevar_lavanderia'
  | 'retirar_lavanderia'
  | 'llevar_modista'
  | 'retirar_modista'
  | 'contactar_medicion'
  | 'retiro_cliente'
  | 'devolucion_cliente'
  | 'agenda_medicion';

export type DashboardItemDto = {
  id: string;
  categoria: DashboardCategoria;
  titulo: string;
  descripcion: string | null;
  fechaReferencia: string | null;
  urgencia: DashboardUrgencia;
  prioridad: PrioridadTareaOperativa | null;
  planillaDestino: string;
  tareaId?: number;
  reservaId?: number | null;
  agendaId?: number | null;
  tarea?: TareaOperativa;
  reserva?: Reserva & {
    accionesPermitidas: {
      editar: { permitida: boolean; motivo: string | null };
      cancelar: { permitida: boolean; motivo: string | null };
      retirar: { permitida: boolean; motivo: string | null };
      devolver: { permitida: boolean; motivo: string | null };
    };
  };
  agenda?: AgendaMedicion;
};

export type ReservaConAccionesDashboardDto = Reserva & {
  accionesPermitidas: {
    editar: { permitida: boolean; motivo: string | null };
    cancelar: { permitida: boolean; motivo: string | null };
    retirar: { permitida: boolean; motivo: string | null };
    devolver: { permitida: boolean; motivo: string | null };
  };
};

export type DashboardOperativoResponse = {
  generadoEn: string;
  resumen: {
    vencidas: number;
    hoy: number;
    proximas: number;
    futuras: number;
    sinFecha: number;
    total: number;
  };
  porCategoria: Record<string, number>;
  items: DashboardItemDto[];
  proximasReservas: ReservaConAccionesDashboardDto[];
};
