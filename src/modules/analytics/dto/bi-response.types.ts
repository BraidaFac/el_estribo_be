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

export type BiLavadosEvolucionPunto = {
  periodo: string;
  cantidad: number;
  costoTotal: number;
};

export type BiLavadosResumen = {
  totalLavados: number;
  costoTotal: number;
  evolucion: BiLavadosEvolucionPunto[];
};

export type BiModistasEvolucionPunto = {
  periodo: string;
  costoTotal: number;
};

export type BiModistasResumen = {
  costoTotal: number;
  evolucion: BiModistasEvolucionPunto[];
};

export type BiResponse = {
  generadoEn: string;
  filtros: { desde: string; hasta: string; granularidad: Granularidad };
  evolucionReservas: BiEvolucionPunto[];
  preEntrega: BiPreEntregaResumen;
  devoluciones: BiDevolucionesResumen;
  lavados: BiLavadosResumen;
  modistas: BiModistasResumen;
};
