import { ControlPreEntrega } from 'src/modules/control-pre-entrega/entity/control-pre-entrega.entity';
import { Reserva } from '../entity/reserva.entity';
import { RecepcionDevolucionReserva } from '../entity/recepcion-devolucion-reserva.entity';

type AccionesReservaDto = {
  editar: { permitida: boolean; motivo: string | null };
  cancelar: { permitida: boolean; motivo: string | null };
  retirar: { permitida: boolean; motivo: string | null };
  devolver: { permitida: boolean; motivo: string | null };
};

export type TrazabilidadEventoDto = {
  id: string;
  categoria:
    | 'reserva'
    | 'tarea'
    | 'movimiento'
    | 'agenda'
    | 'control_pre_entrega'
    | 'cliente';
  titulo: string;
  descripcion: string | null;
  /** ISO 8601 o yyyy-MM-dd según origen */
  fecha: string | null;
};

export type ReservaDetalleOperativoResponse = {
  reserva: Reserva & { accionesPermitidas: AccionesReservaDto };
  controlPreEntrega: ControlPreEntrega | null;
  recepcionDevolucion: RecepcionDevolucionReserva | null;
  trazabilidad: TrazabilidadEventoDto[];
};

export type HistorialReservasResponse = {
  items: (Reserva & { accionesPermitidas: AccionesReservaDto })[];
  total: number;
  page: number;
  limit: number;
};
