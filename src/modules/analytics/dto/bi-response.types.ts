import { MotivoRechazoPreEntrega } from 'src/modules/common/enums/reservas-domain.enums';
import { Granularidad } from './bi-query.dto';

export type BiEvolucionPunto = {
  periodo: string;
  totalReservas: number;
};

export type BiPreEntregaResumen = {
  total: number;
  aprobados: number;
  rechazados: number;
  porMotivo: Record<MotivoRechazoPreEntrega, number>;
};

export type BiDevolucionesResumen = {
  total: number;
  perfectasCondiciones: number;
  malasCondiciones: number;
  conCargoAdicional: number;
};

export type BiResponse = {
  generadoEn: string;
  filtros: { desde: string; hasta: string; granularidad: Granularidad };
  evolucionReservas: BiEvolucionPunto[];
  preEntrega: BiPreEntregaResumen;
  devoluciones: BiDevolucionesResumen;
};
