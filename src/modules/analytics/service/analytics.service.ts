import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  BotonesCierresInspeccion,
  DanoGraveInspeccion,
  EstadoControlPreEntrega,
  MotivoRechazoPreEntrega,
  RuedosTelasInspeccion,
} from 'src/modules/common/enums/reservas-domain.enums';
import { RecepcionDevolucionReserva } from 'src/modules/reservas/entity/recepcion-devolucion-reserva.entity';
import { Between, DataSource, Repository } from 'typeorm';
import { ControlPreEntrega } from '../../control-pre-entrega/entity/control-pre-entrega.entity';
import { Granularidad } from '../dto/bi-query.dto';
import {
  BiDevolucionesResumen,
  BiEvolucionPunto,
  BiLavadosEvolucionPunto,
  BiLavadosResumen,
  BiModistasEvolucionPunto,
  BiModistasResumen,
  BiPreEntregaResumen,
  BiResponse,
} from '../dto/bi-response.types';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ControlPreEntrega)
    private readonly controlRepository: Repository<ControlPreEntrega>,
    @InjectRepository(RecepcionDevolucionReserva)
    private readonly devolucionRepository: Repository<RecepcionDevolucionReserva>,
  ) {}

  async getBiData(
    desde: string,
    hasta: string,
    granularidad: Granularidad,
  ): Promise<BiResponse> {
    const [evolucionReservas, preEntrega, devoluciones, lavados, modistas] =
      await Promise.all([
        this.queryEvolucion(desde, hasta, granularidad),
        this.queryPreEntrega(desde, hasta),
        this.queryDevoluciones(desde, hasta),
        this.queryLavados(desde, hasta, granularidad),
        this.queryCostoModistas(desde, hasta, granularidad),
      ]);

    return {
      generadoEn: new Date().toISOString(),
      filtros: { desde, hasta, granularidad },
      evolucionReservas,
      preEntrega,
      devoluciones,
      lavados,
      modistas,
    };
  }

  private async queryEvolucion(
    desde: string,
    hasta: string,
    granularidad: Granularidad,
  ): Promise<BiEvolucionPunto[]> {
    const format = granularidad === 'MES' ? '%Y-%m' : '%x-W%v';

    const rows: { periodo: string; totalReservas: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_FORMAT(r.fecha_reserva, ?) AS periodo,
          COUNT(r.id)                     AS totalReservas
        FROM reservas r
        WHERE r.fecha_reserva BETWEEN ? AND ?
          AND r.estado_reserva != 'CANCELADA'
        GROUP BY periodo
        ORDER BY periodo ASC
      `,
        [format, desde, hasta],
      );

    return rows.map((row) => ({
      periodo: row.periodo,
      totalReservas: Number(row.totalReservas),
    }));
  }

  private async queryPreEntrega(
    desde: string,
    hasta: string,
  ): Promise<BiPreEntregaResumen> {
    const rows = await this.controlRepository.find({
      where: { reserva: { fechaReserva: Between(desde, hasta) } },
      relations: ['reserva'],
    });

    const total = rows.length;
    const aprobados = rows.filter(
      (r) => r.estado === EstadoControlPreEntrega.APROBADO,
    ).length;
    const rechazados = rows.filter(
      (r) =>
        r.estado === EstadoControlPreEntrega.RECHAZADO ||
        r.estado === EstadoControlPreEntrega.RESUELTO,
    ).length;

    const porMotivo = Object.values(MotivoRechazoPreEntrega).reduce(
      (acc, m) => ({ ...acc, [m]: 0 }),
      {} as Record<MotivoRechazoPreEntrega, number>,
    );

    rows
      .filter((r) => r.motivosRechazo?.length)
      .forEach((r) => {
        r.motivosRechazo!.forEach((m) => {
          porMotivo[m] = (porMotivo[m] ?? 0) + 1;
        });
      });

    return { total, aprobados, rechazados, porMotivo };
  }

  private async queryDevoluciones(
    desde: string,
    hasta: string,
  ): Promise<BiDevolucionesResumen> {
    const rows = await this.devolucionRepository.find({
      where: { reserva: { fechaReserva: Between(desde, hasta) } },
      relations: ['reserva'],
    });

    const total = rows.length;

    const perfectasCondiciones = rows.filter(
      (r) =>
        r.botonesCierresEstado === BotonesCierresInspeccion.OK &&
        r.ruedosTelasEstado === RuedosTelasInspeccion.OK &&
        r.danoGraveEstado === DanoGraveInspeccion.OK,
    ).length;

    const conCargoAdicional = rows.filter(
      (r) =>
        (r.botonesCierresCobro !== null && Number(r.botonesCierresCobro) > 0) ||
        (r.ruedosTelasCobro !== null && Number(r.ruedosTelasCobro) > 0) ||
        (r.danoGraveCobro !== null && Number(r.danoGraveCobro) > 0),
    ).length;

    return {
      total,
      perfectasCondiciones,
      malasCondiciones: total - perfectasCondiciones,
      conCargoAdicional,
    };
  }

  private async queryLavados(
    desde: string,
    hasta: string,
    granularidad: Granularidad,
  ): Promise<BiLavadosResumen> {
    const format = granularidad === 'MES' ? '%Y-%m' : '%x-W%v';

    const rows: { periodo: string; cantidad: string; costoTotal: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_FORMAT(r.fecha_reserva, ?) AS periodo,
          COUNT(t.id)                     AS cantidad,
          COALESCE(SUM((
            SELECT ph.precio
            FROM precio_historico_lavanderia ph
            WHERE ph.lavanderia_id = t.lavanderia_id
              AND ph.vigencia_desde <= DATE(t.fecha_ingreso_lavanderia)
            ORDER BY ph.vigencia_desde DESC
            LIMIT 1
          )), 0) AS costoTotal
        FROM tareas_operativas t
        JOIN reservas r ON r.id = t.reserva_id
        WHERE t.tipo_tarea = 'LLEVAR_LAVANDERIA'
          AND t.estado = 'COMPLETADA'
          AND t.fecha_ingreso_lavanderia IS NOT NULL
          AND r.fecha_reserva BETWEEN ? AND ?
        GROUP BY periodo
        ORDER BY periodo ASC
      `,
        [format, desde, hasta],
      );

    const evolucion: BiLavadosEvolucionPunto[] = rows.map((row) => ({
      periodo: row.periodo,
      cantidad: Number(row.cantidad),
      costoTotal: Number(row.costoTotal),
    }));

    return {
      totalLavados: evolucion.reduce((s, p) => s + p.cantidad, 0),
      costoTotal: evolucion.reduce((s, p) => s + p.costoTotal, 0),
      evolucion,
    };
  }

  private async queryCostoModistas(
    desde: string,
    hasta: string,
    granularidad: Granularidad,
  ): Promise<BiModistasResumen> {
    const format = granularidad === 'MES' ? '%Y-%m' : '%x-W%v';

    const rows: { periodo: string; costoTotal: string }[] =
      await this.dataSource.query(
        `
        SELECT
          DATE_FORMAT(r.fecha_reserva, ?) AS periodo,
          COALESCE(SUM(t.costo_modista), 0) AS costoTotal
        FROM tareas_operativas t
        JOIN reservas r ON r.id = t.reserva_id
        WHERE t.tipo_tarea = 'LLEVAR_MODISTA'
          AND t.estado = 'COMPLETADA'
          AND t.costo_modista IS NOT NULL
          AND r.fecha_reserva BETWEEN ? AND ?
        GROUP BY periodo
        ORDER BY periodo ASC
      `,
        [format, desde, hasta],
      );

    const evolucion: BiModistasEvolucionPunto[] = rows.map((row) => ({
      periodo: row.periodo,
      costoTotal: Number(row.costoTotal),
    }));

    return {
      costoTotal: evolucion.reduce((s, p) => s + p.costoTotal, 0),
      evolucion,
    };
  }
}
