import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { CalendarioLaboralService } from 'src/modules/calendario-laboral/service/calendario-laboral.service';
import {
  EstadoBloqueo,
  OrigenBloqueo,
  TipoBloqueo,
  TipoPrenda,
} from 'src/modules/common/enums/reservas-domain.enums';
import { ConfiguracionGeneralService } from 'src/modules/configuracion-general/service/configuracion-general.service';
import { DateUtils } from 'src/utils/date_utils';
import {
  EntityManager,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { BloqueoPrendaEvento } from '../entity/bloqueo-prenda-evento.entity';
import { BloqueoPrenda } from '../entity/bloqueo-prenda.entity';

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
          input.sacoId,
          input.pantalonId ?? null,
          manager,
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

    const hoy = DateUtils.toDateOnly(DateUtils.getTodayDateOnly());
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

    let listoTienda = await this.calendarioLaboralService.restarDiasHabiles(
      fechaReserva,
      1,
    );

    if (listoTienda < hoy) {
      listoTienda =
        await this.calendarioLaboralService.primerDiaHabilEnRangoInclusive(
          hoy,
          fechaReserva,
        );
    }
    rangos.push({
      tipoBloqueo: TipoBloqueo.LISTO_TIENDA,
      inicio: DateUtils.formatDateOnly(listoTienda),
      fin: DateUtils.formatDateOnly(listoTienda),
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
    sacoId?: number,
    pantalonId?: number | null,
    manager?: EntityManager,
  ): Promise<RangoPlanificado[]> {
    const configuracion = await this.configuracionGeneralService.obtener();

    const ideal = await this.obtenerRangosPlanificados(
      fechaReservaIso,
      requiereModista,
    );

    const fechaReserva = DateUtils.toDateOnly(fechaReservaIso);
    if (!fechaReserva) {
      throw new Error('fechaReserva invalida. Se esperaba formato yyyy-MM-dd');
    }
    const fechaReservaKey = DateUtils.formatDateOnly(fechaReserva);

    const reservaRango = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.RESERVA,
    );

    if (!reservaRango) throw new Error('Plan ideal sin bloqueo de reserva');

    const lavanderiaRangos = ideal.filter(
      (r) => r.tipoBloqueo === TipoBloqueo.LAVANDERIA,
    );
    const modistaIdeal = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.MODISTA,
    );
    const medicionIdeal = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.MEDICION,
    );
    const listoIdeal = ideal.find(
      (r) => r.tipoBloqueo === TipoBloqueo.LISTO_TIENDA,
    );

    // Los spans ideales son directamente los valores de configuración
    const spanModIdeal = requiereModista && modistaIdeal ? configuracion.diasModista : 0;
    const spanMedIdeal = medicionIdeal ? configuracion.diasTomarMediciones : 0;

    // Días hábiles libres consecutivos inmediatamente antes de la reserva (scan backward)
    const dias = await this.listarDiasLibresConsecutivosAntesDeReserva(
      fechaReservaIso,
      sacoId,
      pantalonId,
      manager,
    );

    // Con 0 o 1 día libre, LISTO se mueve a la fecha de reserva y MED+MOD usan todo el presupuesto
    const listoSeMovioAReserva = dias.length <= 1;
    const listoEfectivo = listoSeMovioAReserva
      ? fechaReservaKey
      : dias[dias.length - 1];

    // Presupuesto para MED+MOD: reservar 1 slot para LISTO si tiene día propio
    const diasParaMedMod = listoSeMovioAReserva
      ? dias.length
      : dias.length - 1;

    // Comprimir spans hasta que entren en los días disponibles
    const [spanMed, spanMod] = this.comprimirSpans(
      spanMedIdeal,
      spanModIdeal,
      diasParaMedMod,
    );

    // Construir bloqueos previos según escenario
    const previos: RangoPlanificado[] = [
      this.construirBloqueo(TipoBloqueo.MEDICION, spanMed, 0, dias, fechaReservaKey),
      this.construirBloqueo(TipoBloqueo.MODISTA, spanMod, spanMed, dias, fechaReservaKey, spanMed),
    ];

    // LISTO_TIENDA
    if (listoEfectivo <= fechaReservaKey) {
      previos.push({
        tipoBloqueo: TipoBloqueo.LISTO_TIENDA,
        inicio: listoEfectivo,
        fin: listoEfectivo,
        cancelableManual: false,
      });
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

  /**
   * Reduce spanMed y spanMod proporcionalmente hasta que quepan
   * en la cantidad de días disponibles.
   */
  private comprimirSpans(
    spanMed: number,
    spanMod: number,
    diasDisponibles: number,
  ): [number, number] {
    if (diasDisponibles === 1) {
      return [1, 0];
    }
    if (diasDisponibles === 0) {
      return [0, 0];
    }
    while (spanMed + spanMod > diasDisponibles) {
      if (spanMed > spanMod) {
        spanMed--;
      } else {
        spanMod--;
      }
    }
    return [spanMed, spanMod];
  }

  /**
   * Construye un RangoPlanificado usando días hábiles disponibles.
   * Si span === 0, el bloqueo cae en el mismo día que el bloqueo anterior
   * (fallbackIndex) o en la fecha de reserva si tampoco hay anterior.
   */
  private construirBloqueo(
    tipo: TipoBloqueo,
    span: number,
    offset: number,
    dias: string[],
    fechaReserva: string,
    fallbackIndex?: number,
  ): RangoPlanificado {
    if (span > 0) {
      const slice = dias.slice(offset, offset + span);
      return {
        tipoBloqueo: tipo,
        inicio: slice[0],
        fin: slice[slice.length - 1],
        cancelableManual: true,
      };
    }

    // Sin días propios: caer en el día del bloqueo anterior o en la fecha de reserva
    const diaFallback =
      fallbackIndex !== undefined && dias[fallbackIndex - 1]
        ? dias[fallbackIndex - 1] // mismo día que medición (caso 1 día disponible)
        : fechaReserva; // mismo día que la reserva (caso 0 días disponibles)

    return {
      tipoBloqueo: tipo,
      inicio: diaFallback,
      fin: diaFallback,
      cancelableManual: true,
    };
  }

  private async contarDiasHabilesSinBloqueosEnRango(
    inicioStr: string,
    finStr: string,
    sacoId?: number,
    pantalonId?: number | null,
    manager?: EntityManager,
  ): Promise<number> {
    const lista = await this.listarDiasHabilesSinBloqueosEnRangoInclusive(
      inicioStr,
      finStr,
      sacoId,
      pantalonId,
      manager,
    );
    return lista.length;
  }

  private async contarDiasHabilesEnRango(
    inicioStr: string,
    finStr: string,
  ): Promise<number> {
    const lista = await this.listarDiasHabilesEnRangoInclusive(
      inicioStr,
      finStr,
    );
    return lista.length;
  }

  /**
   * Recorre hacia atrás desde el día anterior a la reserva y acumula días hábiles
   * libres consecutivos hasta encontrar un día hábil ocupado o llegar a hoy.
   * Los días no hábiles (domingos, feriados) se saltan sin romper la cadena.
   */
  private async listarDiasLibresConsecutivosAntesDeReserva(
    fechaReservaStr: string,
    sacoId?: number,
    pantalonId?: number | null,
    manager?: EntityManager,
  ): Promise<string[]> {
    const fechaReserva = DateUtils.toDateOnly(fechaReservaStr);
    const hoy = DateUtils.toDateOnly(DateUtils.getTodayDateOnly());
    if (!fechaReserva) return [];

    const result: string[] = [];
    let cursor = addDays(new Date(fechaReserva), -1);

    while (cursor >= hoy) {
      const esHabil = await this.calendarioLaboralService.esHabil(new Date(cursor));
      if (!esHabil) {
        cursor = addDays(cursor, -1);
        continue;
      }
      const fechaStr = DateUtils.formatDateOnly(cursor);
      const libre =
        sacoId === undefined ||
        (await this.esDiaLibreParaPrenda(fechaStr, sacoId, pantalonId ?? null, manager));
      if (!libre) break;
      result.unshift(fechaStr);
      cursor = addDays(cursor, -1);
    }

    return result;
  }

  private async listarDiasHabilesSinBloqueosEnRangoInclusive(
    inicioStr: string,
    finStr: string,
    sacoId?: number,
    pantalonId?: number | null,
    manager?: EntityManager,
  ): Promise<string[]> {
    const inicio = DateUtils.toDateOnly(inicioStr);
    const fin = DateUtils.toDateOnly(finStr);
    if (!inicio || !fin || inicio > fin) {
      return [];
    }
    const out: string[] = [];
    for (let d = new Date(inicio); d <= fin; d = addDays(d, 1)) {
      const fechaStr = DateUtils.formatDateOnly(d);
      const esHabil = await this.calendarioLaboralService.esHabil(new Date(d));
      if (!esHabil) continue;
      if (
        sacoId !== undefined &&
        !(await this.esDiaLibreParaPrenda(
          fechaStr,
          sacoId,
          pantalonId ?? null,
          manager,
        ))
      ) {
        continue;
      }
      out.push(fechaStr);
    }

    return out;
  }

  private async listarDiasHabilesEnRangoInclusive(
    inicioStr: string,
    finStr: string,
  ): Promise<string[]> {
    const hoy = DateUtils.toDateOnly(DateUtils.getTodayDateOnly());

    let inicio = DateUtils.toDateOnly(inicioStr);
    const fin = DateUtils.toDateOnly(finStr);
    if (!inicio || !fin || inicio > fin || fin <= hoy) {
      return [];
    }

    inicio = inicio < hoy ? hoy : inicio;

    const out: string[] = [];
    for (let d = new Date(inicio); d <= fin; d = addDays(d, 1)) {
      const fechaStr = DateUtils.formatDateOnly(d);
      const esHabil = await this.calendarioLaboralService.esHabil(new Date(d));
      if (!esHabil) continue;
      out.push(fechaStr);
    }

    return out;
  }
  /**
   * Devuelve true si ni el saco ni el pantalón (si aplica) tienen un bloqueo
   * activo que cubra la fecha dada. Excluye la fecha de la reserva (RESERVA-type)
   * ya que ese bloqueo es el que se está creando.
   */
  private async esDiaLibreParaPrenda(
    fechaStr: string,
    sacoId: number,
    pantalonId: number | null,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(BloqueoPrenda)
      : this.bloqueoRepository;

    const sacoBlocked = await repo.existsBy({
      tipoPrenda: TipoPrenda.SACO,
      saco: { id: sacoId },
      estado: EstadoBloqueo.ACTIVO,
      inicio: LessThanOrEqual(fechaStr),
      fin: MoreThanOrEqual(fechaStr),
    });

    if (sacoBlocked) return false;

    if (pantalonId) {
      const pantBlocked = await repo.existsBy({
        tipoPrenda: TipoPrenda.PANTALON,
        pantalon: { id: pantalonId },
        estado: EstadoBloqueo.ACTIVO,
        inicio: LessThanOrEqual(fechaStr),
        fin: MoreThanOrEqual(fechaStr),
      });
      if (pantBlocked) return false;
    }

    return true;
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
