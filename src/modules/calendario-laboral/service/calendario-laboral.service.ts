import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays } from 'date-fns';
import { DateUtils } from 'src/utils/date_utils';
import { Repository } from 'typeorm';
import { Feriado } from '../entity/feriado.entity';

type TipoDiaNoLaborable = 'DOMINGO' | 'FERIADO';

export interface DiaNoLaborableResponse {
  fecha: string;
  tipo: TipoDiaNoLaborable;
  descripcion: string | null;
}

@Injectable()
export class CalendarioLaboralService {
  constructor(
    @InjectRepository(Feriado)
    private readonly feriadoRepository: Repository<Feriado>,
  ) {}

  async esHabil(fecha: Date): Promise<boolean> {
    if (fecha.getDay() === 0) {
      return false;
    }

    const fechaNormalizada = DateUtils.formatDateOnly(fecha);
    const feriado = await this.feriadoRepository.findOne({
      where: { fecha: fechaNormalizada, activo: true },
      select: ['id'],
    });

    return !feriado;
  }

  async sumarDiasHabiles(base: Date, cantidad: number): Promise<Date> {
    let fechaCursor = DateUtils.toUtcDateStart(base);
    let restantes = Math.max(cantidad, 0);

    while (restantes > 0) {
      fechaCursor = addDays(fechaCursor, 1);
      if (await this.esHabil(fechaCursor)) {
        restantes -= 1;
      }
    }

    return fechaCursor;
  }

  async restarDiasHabiles(base: Date, cantidad: number): Promise<Date> {
    let fechaCursor = DateUtils.toUtcDateStart(base);
    let restantes = Math.max(cantidad, 0);

    while (restantes > 0) {
      fechaCursor = addDays(fechaCursor, -1);
      if (await this.esHabil(fechaCursor)) {
        restantes -= 1;
      }
    }

    return fechaCursor;
  }

  async listarFeriados(desde?: string, hasta?: string): Promise<Feriado[]> {
    const desdeNormalizada = desde ? DateUtils.normalizeDateOnly(desde) : null;
    const hastaNormalizada = hasta ? DateUtils.normalizeDateOnly(hasta) : null;

    if (desde && !desdeNormalizada) {
      throw new BadRequestException('desde debe tener formato yyyy-MM-dd');
    }
    if (hasta && !hastaNormalizada) {
      throw new BadRequestException('hasta debe tener formato yyyy-MM-dd');
    }
    if ((desde && !hasta) || (!desde && hasta)) {
      throw new BadRequestException(
        'desde y hasta deben enviarse juntos para filtrar',
      );
    }
    if (
      desdeNormalizada &&
      hastaNormalizada &&
      desdeNormalizada > hastaNormalizada
    ) {
      throw new BadRequestException('desde no puede ser mayor a hasta');
    }

    const qb = this.feriadoRepository
      .createQueryBuilder('feriado')
      .where('feriado.activo = :activo', { activo: true })
      .orderBy('feriado.fecha', 'ASC');

    if (desdeNormalizada && hastaNormalizada) {
      qb.andWhere('feriado.fecha BETWEEN :desde AND :hasta', {
        desde: desdeNormalizada,
        hasta: hastaNormalizada,
      });
    }

    return qb.getMany();
  }

  async listarDiasNoLaborables(
    desde: string,
    hasta: string,
  ): Promise<DiaNoLaborableResponse[]> {
    const desdeNormalizada = DateUtils.normalizeDateOnly(desde);
    if (!desdeNormalizada) {
      throw new BadRequestException('desde debe tener formato yyyy-MM-dd');
    }

    const hastaNormalizada = DateUtils.normalizeDateOnly(hasta);
    if (!hastaNormalizada) {
      throw new BadRequestException('hasta debe tener formato yyyy-MM-dd');
    }

    if (desdeNormalizada > hastaNormalizada) {
      throw new BadRequestException('desde no puede ser mayor a hasta');
    }

    const desdeDate = DateUtils.toDateOnly(desdeNormalizada);
    const hastaDate = DateUtils.toDateOnly(hastaNormalizada);
    if (!desdeDate || !hastaDate) {
      throw new BadRequestException(
        'No se pudo interpretar el rango de fechas enviado',
      );
    }

    const feriados = await this.listarFeriados(
      desdeNormalizada,
      hastaNormalizada,
    );
    const resultado = new Map<string, DiaNoLaborableResponse>();

    for (const feriado of feriados) {
      resultado.set(feriado.fecha, {
        fecha: feriado.fecha,
        tipo: 'FERIADO',
        descripcion: feriado.descripcion,
      });
    }

    for (
      let cursor = new Date(desdeDate);
      cursor <= hastaDate;
      cursor = addDays(cursor, 1)
    ) {
      if (cursor.getDay() === 0) {
        const fecha = DateUtils.formatDateOnly(cursor);
        if (!resultado.has(fecha)) {
          resultado.set(fecha, {
            fecha,
            tipo: 'DOMINGO',
            descripcion: null,
          });
        }
      }
    }

    return Array.from(resultado.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );
  }
}
