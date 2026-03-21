import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TareasOperativasService } from 'src/modules/tareas-operativas/service/tareas-operativas.service';
import { DataSource, Repository } from 'typeorm';
import { GuardarMedicionesReservaDto } from '../dto/guardar-mediciones-reserva.dto';
import { MedicionReserva } from '../entity/medicion-reserva.entity';
import { Reserva } from '../entity/reserva.entity';
import {
  medicionesReservaVacias,
  MedicionesReservaJson,
  type MedidasPantalonJson,
  type MedidasSacoJson,
} from '../types/mediciones-reserva.types';

const SACO_KEYS = [
  'pecho',
  'hombros',
  'largoSaco',
  'largoManga',
  'cintura',
  'espalda',
] as const;

const PANT_KEYS = [
  'cintura',
  'cadera',
  'largoPiernaInterno',
  'largoTotal',
  'tiro',
  'musloYPierna',
  'bota',
] as const;

/** JWT `sub` u otros payloads pueden venir como número u objeto; solo persistimos string corta. */
function normalizarUsuarioId(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t.slice(0, 80);
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(v).slice(0, 80);
  }
  return null;
}

/** Driver BD puede devolver `Date` o string en columnas timestamp. */
function fechaIsoSeguro(v: unknown): string {
  const d = v instanceof Date ? v : new Date(v as string | number);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) {
    throw new BadRequestException('Las medidas deben ser numeros validos o vacias');
  }
  return n;
}

function mergeSaco(
  base: MedidasSacoJson,
  patch?: Record<string, unknown>,
): MedidasSacoJson {
  if (!patch) return base;
  const next = { ...base };
  for (const k of SACO_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      next[k] = toNullableNumber(patch[k]);
    }
  }
  return next;
}

function mergePantalon(
  base: MedidasPantalonJson,
  patch?: Record<string, unknown>,
): MedidasPantalonJson {
  if (!patch) return base;
  const next = { ...base };
  for (const k of PANT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      next[k] = toNullableNumber(patch[k]);
    }
  }
  return next;
}

@Injectable()
export class MedicionesReservaService {
  constructor(
    @InjectRepository(MedicionReserva)
    private readonly medicionRepository: Repository<MedicionReserva>,
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  async obtenerPorReserva(reservaId: number): Promise<{
    reservaId: number;
    mediciones: MedicionesReservaJson;
    actualizadoEn: string | null;
  }> {
    const reserva = await this.reservaRepository.findOne({
      where: { id: reservaId },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    const row = await this.medicionRepository.findOne({
      where: { reserva: { id: reservaId } },
    });
    if (!row) {
      return {
        reservaId,
        mediciones: medicionesReservaVacias(),
        actualizadoEn: null,
      };
    }
    return {
      reservaId,
      mediciones: row.medicionesJson,
      actualizadoEn: fechaIsoSeguro(row.updatedAt),
    };
  }

  async guardar(
    reservaId: number,
    dto: GuardarMedicionesReservaDto,
    usuarioSub?: unknown,
  ): Promise<{
    reservaId: number;
    mediciones: MedicionesReservaJson;
    actualizadoEn: string;
  }> {
    const base = await this.medicionRepository.findOne({
      where: { reserva: { id: reservaId } },
    });
    const mergedBase = base?.medicionesJson ?? medicionesReservaVacias();
    const merged: MedicionesReservaJson = {
      saco: mergeSaco(mergedBase.saco, dto.saco),
      pantalon: mergePantalon(mergedBase.pantalon, dto.pantalon),
    };

    const creadoPor =
      normalizarUsuarioId(dto.usuarioId) ?? normalizarUsuarioId(usuarioSub);

    return this.dataSource.transaction(async (manager) => {
      const reserva = await manager.getRepository(Reserva).findOne({
        where: { id: reservaId },
      });
      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      const medicionRepo = manager.getRepository(MedicionReserva);
      const existente = await medicionRepo.findOne({
        where: { reserva: { id: reservaId } },
      });

      let guardado: MedicionReserva;
      if (existente) {
        existente.medicionesJson = merged;
        existente.creadoPor = creadoPor ?? existente.creadoPor;
        guardado = await medicionRepo.save(existente);
      } else {
        const nuevo = medicionRepo.create({
          reserva,
          medicionesJson: merged,
          creadoPor,
        });
        guardado = await medicionRepo.save(nuevo);
      }

      await this.tareasOperativasService.aplicarEfectosPostGuardadoMediciones(
        reservaId,
        creadoPor,
        manager,
      );

      return {
        reservaId,
        mediciones: merged,
        actualizadoEn: fechaIsoSeguro(guardado.updatedAt),
      };
    });
  }
}
