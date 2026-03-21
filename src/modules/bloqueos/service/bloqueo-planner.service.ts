import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    const rangosBase = await this.obtenerRangosPlanificados(
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
