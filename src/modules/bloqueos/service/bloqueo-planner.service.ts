import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { CalendarioLaboralService } from 'src/modules/calendario-laboral/service/calendario-laboral.service';
import { ConfiguracionGeneralService } from 'src/modules/configuracion-general/service/configuracion-general.service';
import {
  EstadoBloqueo,
  OrigenBloqueo,
  TipoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { DateUtils } from 'src/utils/date_utils';
import { EntityManager, Repository } from 'typeorm';
import { BloqueoPrenda } from '../entity/bloqueo-prenda.entity';
import { BloqueoPrendaEvento } from '../entity/bloqueo-prenda-evento.entity';

export type RangoPlanificado = {
  tipoBloqueo: TipoBloqueo;
  inicio: string;
  fin: string;
  cancelableManual: boolean;
};

type PlanificarBloqueosInput = {
  reservaId: number;
  fechaReserva: string;
  sacoId: number;
  pantalonId?: number | null;
  modistaId?: number | null;
  lavanderiaId?: number | null;
  requiereModista: boolean;
  creadoPor?: string | null;
  /** Solo recorta/omite bloqueos previos; lavandería y validación de posteriores siguen el plan ideal. */
  reservaUltimoMomento?: boolean;
};

@Injectable()
export class BloqueoPlannerService {
  constructor(
    @InjectRepository(BloqueoPrenda)
    private readonly bloqueoRepository: Repository<BloqueoPrenda>,
    @InjectRepository(BloqueoPrendaEvento)
    private readonly eventoRepository: Repository<BloqueoPrendaEvento>,
    private readonly calendarioLaboralService: CalendarioLaboralService,
    private readonly configuracionGeneralService: ConfiguracionGeneralService,
  ) {}

  async planificarBloqueosDerivados(
    input: PlanificarBloqueosInput,
    manager?: EntityManager,
  ): Promise<void> {
    const rangosBase = input.reservaUltimoMomento
      ? await this.obtenerRangosPlanificadosUltimoMomento(
          input.fechaReserva,
          input.requiereModista,
        )
      : await this.obtenerRangosPlanificados(
          input.fechaReserva,
          input.requiereModista,
        );

    await this.crearBloqueosDePrenda(
      {
        tipoPrenda: TipoPrenda.SACO,
        prendaId: input.sacoId,
        reservaId: input.reservaId,
        modistaId: input.modistaId ?? null,
        lavanderiaId: input.lavanderiaId ?? null,
        rangos: rangosBase,
        creadoPor: input.creadoPor ?? null,
      },
      manager,
    );

    if (input.pantalonId) {
      await this.crearBloqueosDePrenda(
        {
          tipoPrenda: TipoPrenda.PANTALON,
          prendaId: input.pantalonId,
          reservaId: input.reservaId,
          modistaId: input.modistaId ?? null,
          lavanderiaId: input.lavanderiaId ?? null,
          rangos: rangosBase,
          creadoPor: input.creadoPor ?? null,
        },
        manager,
      );
    }
  }

  async obtenerRangosPlanificados(
    fechaReservaIso: string,
    requiereModista: boolean,
  ): Promise<RangoPlanificado[]> {
    const configuracion = await this.configuracionGeneralService.obtener();
    const fechaReserva = DateUtils.toDateOnly(fechaReservaIso);

    if (!fechaReserva) {
      throw new Error('fechaReserva invalida. Se esperaba formato yyyy-MM-dd');
    }

    const rangos: RangoPlanificado[] = [];
    let inicioModista: Date | null = null;

    if (requiereModista && configuracion.diasModista > 0) {
      inicioModista = await this.calendarioLaboralService.restarDiasHabiles(
        fechaReserva,
        configuracion.diasModista + 1,
      );
      const finModista = await this.calendarioLaboralService.restarDiasHabiles(
        fechaReserva,
        2,
      );
      rangos.push({
        tipoBloqueo: TipoBloqueo.MODISTA,
        inicio: DateUtils.formatDateOnly(inicioModista),
        fin: DateUtils.formatDateOnly(finModista),
        cancelableManual: true,
      });
    }

    if (configuracion.diasTomarMediciones > 0) {
      const baseMedicion = inicioModista ?? fechaReserva;
      const inicioMedicion =
        await this.calendarioLaboralService.restarDiasHabiles(
          baseMedicion,
          configuracion.diasTomarMediciones,
        );
      const finMedicion = await this.calendarioLaboralService.restarDiasHabiles(
        baseMedicion,
        1,
      );

      rangos.push({
        tipoBloqueo: TipoBloqueo.MEDICION,
        inicio: DateUtils.formatDateOnly(inicioMedicion),
        fin: DateUtils.formatDateOnly(finMedicion),
        cancelableManual: true,
      });
    }

    rangos.push({
      tipoBloqueo: TipoBloqueo.LISTO_TIENDA,
      inicio: DateUtils.formatDateOnly(
        await this.calendarioLaboralService.restarDiasHabiles(fechaReserva, 1),
      ),
      fin: DateUtils.formatDateOnly(
        await this.calendarioLaboralService.restarDiasHabiles(fechaReserva, 1),
      ),
      cancelableManual: false,
    });

    rangos.push({
      tipoBloqueo: TipoBloqueo.RESERVA,
      inicio: fechaReservaIso,
      fin: fechaReservaIso,
      cancelableManual: false,
    });

    if (configuracion.diasLavanderia > 0) {
      const inicioLavanderia =
        await this.calendarioLaboralService.sumarDiasHabiles(fechaReserva, 1);
      const finLavanderia =
        await this.calendarioLaboralService.sumarDiasHabiles(
          fechaReserva,
          configuracion.diasLavanderia,
        );
      rangos.push({
        tipoBloqueo: TipoBloqueo.LAVANDERIA,
        inicio: DateUtils.formatDateOnly(inicioLavanderia),
        fin: DateUtils.formatDateOnly(finLavanderia),
        cancelableManual: true,
      });
    }

    const prioridad: Record<TipoBloqueo, number> = {
      [TipoBloqueo.MEDICION]: 1,
      [TipoBloqueo.MODISTA]: 2,
      [TipoBloqueo.LISTO_TIENDA]: 3,
      [TipoBloqueo.RESERVA]: 4,
      [TipoBloqueo.LAVANDERIA]: 5,
      [TipoBloqueo.MANTENIMIENTO]: 6,
      [TipoBloqueo.MANUAL]: 7,
    };

    return rangos.sort(
      (a, b) => prioridad[a.tipoBloqueo] - prioridad[b.tipoBloqueo],
    );
  }

  /**
   * Reparte medición, modista y listo en tienda solo en días hábiles desde hoy hasta antes del evento.
   * Omite primero "listo en tienda", luego reduce días de modista, luego medición (modista tiene prioridad).
   * La reserva y la lavandería posteriores se toman del plan ideal sin recortar.
   */
  async obtenerRangosPlanificadosUltimoMomento(
    fechaReservaIso: string,
    requiereModista: boolean,
  ): Promise<RangoPlanificado[]> {
    const hoy = DateUtils.getTodayDateOnly();
    const ideal = await this.obtenerRangosPlanificados(
      fechaReservaIso,
      requiereModista,
    );

    const fechaReserva = DateUtils.toDateOnly(fechaReservaIso);
    if (!fechaReserva) {
      throw new Error('fechaReserva invalida. Se esperaba formato yyyy-MM-dd');
    }

    const reservaRango = ideal.find((r) => r.tipoBloqueo === TipoBloqueo.RESERVA);
    const lavanderiaRangos = ideal.filter(
      (r) => r.tipoBloqueo === TipoBloqueo.LAVANDERIA,
    );
    const modistaIdeal = ideal.find((r) => r.tipoBloqueo === TipoBloqueo.MODISTA);
    const medicionIdeal = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.MEDICION,
    );
    const listoIdeal = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.LISTO_TIENDA,
    );

    const dias = await this.listarDiasHabilesDesdeHastaExclusivo(
      hoy,
      fechaReservaIso,
    );

    let spanMod = modistaIdeal
      ? await this.contarDiasHabilesEnRango(
          modistaIdeal.inicio,
          modistaIdeal.fin,
        )
      : 0;
    let spanMed = medicionIdeal
      ? await this.contarDiasHabilesEnRango(
          medicionIdeal.inicio,
          medicionIdeal.fin,
        )
      : 0;

    while (spanMed + spanMod > dias.length) {
      if (spanMod > 1) {
        spanMod--;
        continue;
      }
      if (spanMed > 0) {
        spanMed = 0;
        continue;
      }
      if (spanMod > 0) {
        spanMod = 0;
        continue;
      }
      break;
    }

    if (spanMed + spanMod > dias.length) {
      throw new BadRequestException(
        'No hay dias habiles suficientes entre hoy y la fecha de reserva para los bloqueos previos.',
      );
    }

    const previos: RangoPlanificado[] = [];
    let offset = 0;

    if (spanMed > 0) {
      const slice = dias.slice(offset, offset + spanMed);
      offset += spanMed;
      previos.push({
        tipoBloqueo: TipoBloqueo.MEDICION,
        inicio: slice[0],
        fin: slice[slice.length - 1],
        cancelableManual: true,
      });
    }

    if (spanMod > 0) {
      const slice = dias.slice(offset, offset + spanMod);
      offset += spanMod;
      previos.push({
        tipoBloqueo: TipoBloqueo.MODISTA,
        inicio: slice[0],
        fin: slice[slice.length - 1],
        cancelableManual: true,
      });
    }

    if (listoIdeal) {
      const diaListo = DateUtils.formatDateOnly(
        await this.calendarioLaboralService.restarDiasHabiles(fechaReserva, 1),
      );
      const fechaReservaKey = DateUtils.formatDateOnly(fechaReserva);
      const assigned = new Set<string>();
      for (const p of previos) {
        const enRango = await this.listarDiasHabilesEnRangoInclusive(
          p.inicio,
          p.fin,
        );
        for (const d of enRango) {
          assigned.add(d);
        }
      }
      if (
        diaListo >= hoy &&
        diaListo < fechaReservaKey &&
        !assigned.has(diaListo)
      ) {
        previos.push({
          tipoBloqueo: TipoBloqueo.LISTO_TIENDA,
          inicio: diaListo,
          fin: diaListo,
          cancelableManual: false,
        });
      }
    }

    if (!reservaRango) {
      throw new Error('Plan ideal sin bloqueo de reserva');
    }

    const rangos: RangoPlanificado[] = [
      ...previos,
      reservaRango,
      ...lavanderiaRangos,
    ];

    const prioridad: Record<TipoBloqueo, number> = {
      [TipoBloqueo.MEDICION]: 1,
      [TipoBloqueo.MODISTA]: 2,
      [TipoBloqueo.LISTO_TIENDA]: 3,
      [TipoBloqueo.RESERVA]: 4,
      [TipoBloqueo.LAVANDERIA]: 5,
      [TipoBloqueo.MANTENIMIENTO]: 6,
      [TipoBloqueo.MANUAL]: 7,
    };

    return rangos.sort(
      (a, b) => prioridad[a.tipoBloqueo] - prioridad[b.tipoBloqueo],
    );
  }

  private async contarDiasHabilesEnRango(
    inicioStr: string,
    finStr: string,
  ): Promise<number> {
    const lista = await this.listarDiasHabilesEnRangoInclusive(inicioStr, finStr);
    return lista.length;
  }

  private async listarDiasHabilesDesdeHastaExclusivo(
    desdeStr: string,
    fechaReservaIso: string,
  ): Promise<string[]> {
    const fin = DateUtils.toDateOnly(fechaReservaIso);
    const desde = DateUtils.toDateOnly(desdeStr);
    if (!fin || !desde) {
      return [];
    }
    const out: string[] = [];
    for (let d = new Date(desde); d < fin; d = addDays(d, 1)) {
      if (await this.calendarioLaboralService.esHabil(new Date(d))) {
        out.push(DateUtils.formatDateOnly(d));
      }
    }
    return out;
  }

  private async listarDiasHabilesEnRangoInclusive(
    inicioStr: string,
    finStr: string,
  ): Promise<string[]> {
    const inicio = DateUtils.toDateOnly(inicioStr);
    const fin = DateUtils.toDateOnly(finStr);
    if (!inicio || !fin || inicio > fin) {
      return [];
    }
    const out: string[] = [];
    for (let d = new Date(inicio); d <= fin; d = addDays(d, 1)) {
      if (await this.calendarioLaboralService.esHabil(new Date(d))) {
        out.push(DateUtils.formatDateOnly(d));
      }
    }
    return out;
  }

  private async crearBloqueosDePrenda(
    args: {
      tipoPrenda: TipoPrenda;
      prendaId: number;
      reservaId: number;
      modistaId: number | null;
      lavanderiaId: number | null;
      rangos: RangoPlanificado[];
      creadoPor: string | null;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const bloqueoRepo = manager
      ? manager.getRepository(BloqueoPrenda)
      : this.bloqueoRepository;
    const eventoRepo = manager
      ? manager.getRepository(BloqueoPrendaEvento)
      : this.eventoRepository;

    for (const rango of args.rangos) {
      const bloqueo = bloqueoRepo.create({
        tipoPrenda: args.tipoPrenda,
        saco:
          args.tipoPrenda === TipoPrenda.SACO
            ? ({ id: args.prendaId } as any)
            : null,
        pantalon:
          args.tipoPrenda === TipoPrenda.PANTALON
            ? ({ id: args.prendaId } as any)
            : null,
        reserva: { id: args.reservaId } as any,
        tipoBloqueo: rango.tipoBloqueo,
        origen: OrigenBloqueo.AUTOMATICO,
        estado: EstadoBloqueo.ACTIVO,
        inicio: rango.inicio,
        fin: rango.fin,
        modista:
          rango.tipoBloqueo === TipoBloqueo.MODISTA && args.modistaId
            ? ({ id: args.modistaId } as any)
            : null,
        lavanderia:
          rango.tipoBloqueo === TipoBloqueo.LAVANDERIA && args.lavanderiaId
            ? ({ id: args.lavanderiaId } as any)
            : null,
        cancelableManual: rango.cancelableManual,
        creadoPor: args.creadoPor,
      });

      const bloqueoGuardado = await bloqueoRepo.save(bloqueo);
      await eventoRepo.save(
        eventoRepo.create({
          bloqueo: bloqueoGuardado,
          evento: 'CREADO_AUTOMATICO',
          usuarioId: args.creadoPor,
          payloadJson: {
            tipoPrenda: args.tipoPrenda,
            prendaId: args.prendaId,
            reservaId: args.reservaId,
            tipoBloqueo: rango.tipoBloqueo,
          },
        }),
      );
    }
  }
}
