import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DateUtils } from 'src/utils/date_utils';
import { CreateFeriadoDto } from '../dto/create-feriado.dto';
import { UpdateFeriadoDto } from '../dto/update-feriado.dto';
import { Feriado, FeriadoOrigen } from '../entity/feriado.entity';

const ARGENTINA_DATOS_FERIADOS_URL = 'https://api.argentinadatos.com/v1/feriados';

export interface FeriadoV2Response {
  id: number;
  fecha: string;
  motivo: string | null;
  origen: FeriadoOrigen;
  tipo: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ArgentinaDatosFeriadoItem {
  fecha: string;
  tipo: string;
  nombre: string;
}

@Injectable()
export class FeriadosService {
  private readonly logger = new Logger(FeriadosService.name);

  constructor(
    @InjectRepository(Feriado)
    private readonly feriadoRepository: Repository<Feriado>,
  ) {}

  private toResponse(row: Feriado): FeriadoV2Response {
    return {
      id: row.id,
      fecha: row.fecha,
      motivo: row.descripcion,
      origen: row.origen,
      tipo: row.tipo,
      activo: row.activo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async contarPorAno(ano: number): Promise<number> {
    const desde = `${ano}-01-01`;
    const hasta = `${ano}-12-31`;
    return this.feriadoRepository
      .createQueryBuilder('f')
      .where('f.fecha BETWEEN :desde AND :hasta', { desde, hasta })
      .getCount();
  }

  /**
   * Idempotente: si ya hay al menos un feriado del año actual en base, no hace nada.
   * Si no hay ninguno, intenta cargar desde Argentina Datos; si falla la API, solo registra warning.
   */
  async ensureFeriadosOficialesAnoActualDesdeApi(): Promise<void> {
    const ano = new Date().getFullYear();
    try {
      const count = await this.contarPorAno(ano);
      if (count > 0) {
        this.logger.log(
          `Feriados: ya existen registros para ${ano}; se omite la carga desde API.`,
        );
        return;
      }

      const items = await this.fetchArgentinaDatosFeriados(ano);
      let insertados = 0;
      for (const item of items) {
        const fechaNorm = DateUtils.normalizeDateOnly(item.fecha);
        if (!fechaNorm) {
          this.logger.warn(`Feriados API: fecha ignorada (formato inválido): ${item.fecha}`);
          continue;
        }

        const existe = await this.feriadoRepository.exist({
          where: { fecha: fechaNorm },
        });
        if (existe) {
          continue;
        }

        await this.feriadoRepository.insert({
          fecha: fechaNorm,
          descripcion: item.nombre?.trim() || null,
          origen: 'API',
          tipo: item.tipo?.trim() || null,
          activo: true,
        });
        insertados += 1;
      }

      this.logger.log(
        `Feriados: carga inicial ${ano} desde API completada (${insertados} insertados).`,
      );
    } catch (err) {
      this.logger.warn(
        `Feriados: carga inicial automática no completada (${ano}): ${
          err instanceof Error ? err.message : String(err)
        }. El sistema continúa; podés cargar feriados manualmente.`,
      );
    }
  }

  private async fetchArgentinaDatosFeriados(
    ano: number,
  ): Promise<ArgentinaDatosFeriadoItem[]> {
    const url = `${ARGENTINA_DATOS_FERIADOS_URL}/${ano}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('respuesta inválida');
      }
      return data as ArgentinaDatosFeriadoItem[];
    } finally {
      clearTimeout(timeout);
    }
  }

  async listar(ano?: number): Promise<FeriadoV2Response[]> {
    const qb = this.feriadoRepository
      .createQueryBuilder('f')
      .orderBy('f.fecha', 'ASC');

    if (ano !== undefined) {
      qb.andWhere('f.fecha BETWEEN :desde AND :hasta', {
        desde: `${ano}-01-01`,
        hasta: `${ano}-12-31`,
      });
    }

    const rows = await qb.getMany();
    return rows.map((r) => this.toResponse(r));
  }

  async obtener(id: number): Promise<FeriadoV2Response> {
    const row = await this.feriadoRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Feriado no encontrado');
    }
    return this.toResponse(row);
  }

  async crear(dto: CreateFeriadoDto): Promise<FeriadoV2Response> {
    const fechaNorm = DateUtils.normalizeDateOnly(dto.fecha);
    if (!fechaNorm) {
      throw new BadRequestException('fecha debe tener formato yyyy-MM-dd');
    }

    const existe = await this.feriadoRepository.exist({
      where: { fecha: fechaNorm },
    });
    if (existe) {
      throw new ConflictException('Ya existe un feriado en esa fecha');
    }

    const guardado = await this.feriadoRepository.save({
      fecha: fechaNorm,
      descripcion: dto.motivo.trim(),
      origen: 'MANUAL',
      tipo: null,
      activo: true,
    });

    return this.toResponse(guardado);
  }

  async actualizar(id: number, dto: UpdateFeriadoDto): Promise<FeriadoV2Response> {
    const row = await this.feriadoRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Feriado no encontrado');
    }

    let fechaNorm = row.fecha;
    if (dto.fecha !== undefined) {
      const parsed = DateUtils.normalizeDateOnly(dto.fecha);
      if (!parsed) {
        throw new BadRequestException('fecha debe tener formato yyyy-MM-dd');
      }
      if (parsed !== row.fecha) {
        const conflicto = await this.feriadoRepository.findOne({
          where: { fecha: parsed },
        });
        if (conflicto && conflicto.id !== id) {
          throw new ConflictException('Ya existe un feriado en esa fecha');
        }
        fechaNorm = parsed;
      }
    }

    if (dto.motivo !== undefined) {
      row.descripcion = dto.motivo.trim();
    }
    row.fecha = fechaNorm;

    const guardado = await this.feriadoRepository.save(row);
    return this.toResponse(guardado);
  }

  async eliminar(id: number): Promise<{ message: string }> {
    const res = await this.feriadoRepository.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Feriado no encontrado');
    }
    return { message: 'Eliminado' };
  }
}
