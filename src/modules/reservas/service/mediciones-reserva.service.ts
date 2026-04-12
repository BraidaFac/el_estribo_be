import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { TareasOperativasService } from 'src/modules/tareas-operativas/service/tareas-operativas.service';
import { User } from 'src/user/user.entity';
import { DataSource, Repository } from 'typeorm';
import { GuardarMedicionesReservaDto } from '../dto/guardar-mediciones-reserva.dto';
import { MedicionReserva } from '../entity/medicion-reserva.entity';
import { Reserva } from '../entity/reserva.entity';
import {
  MedicionesReservaJson,
  medicionesReservaVacias,
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
    throw new BadRequestException(
      'Las medidas deben ser numeros validos o vacias',
    );
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
    creadoPor: { id: string; name: string } | null;
    observacionSaco: string | null;
    observacionPantalon: string | null;
    observacionGeneral: string | null;
    sinModista: boolean;
  }> {
    const reserva = await this.reservaRepository.findOne({
      where: { id: reservaId },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    const row = await this.medicionRepository.findOne({
      where: { reserva: { id: reservaId } },
      relations: ['creadoPor'],
    });
    if (!row) {
      return {
        reservaId,
        mediciones: medicionesReservaVacias(),
        actualizadoEn: null,
        creadoPor: null,
        observacionSaco: null,
        observacionPantalon: null,
        observacionGeneral: null,
        sinModista: false,
      };
    }
    return {
      reservaId,
      mediciones: row.medicionesJson,
      actualizadoEn: fechaIsoSeguro(row.updatedAt),
      creadoPor: row.creadoPor
        ? { id: row.creadoPor.id, name: row.creadoPor.name }
        : null,
      observacionSaco: row.observacionSaco,
      observacionPantalon: row.observacionPantalon,
      observacionGeneral: row.observacionGeneral,
      sinModista: row.sinModista,
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
    const sinModista = dto.sinModista === true;

    const base = await this.medicionRepository.findOne({
      where: { reserva: { id: reservaId } },
    });
    const mergedBase = base?.medicionesJson ?? medicionesReservaVacias();

    // Cuando sinModista=true las medidas numéricas quedan todas en null
    const vacias = medicionesReservaVacias();
    const merged: MedicionesReservaJson = sinModista
      ? { saco: vacias.saco, pantalon: vacias.pantalon }
      : {
          saco: mergeSaco(mergedBase.saco, dto.saco),
          pantalon: mergePantalon(mergedBase.pantalon, dto.pantalon),
        };

    const creadoPor = normalizarUsuarioId(usuarioSub);

    return this.dataSource.transaction(async (manager) => {
      const reserva = await manager.getRepository(Reserva).findOne({
        where: { id: reservaId },
        relations: ['saco', 'pantalon'],
      });
      if (!reserva) {
        throw new NotFoundException('Reserva no encontrada');
      }

      if (reserva.saco.ubicacionActual !== 'TIENDA') {
        throw new BadRequestException(
          `No se pueden registrar las mediciones: el saco no se encuentra físicamente en el local (ubicación actual: ${reserva.saco.ubicacionActual}).`,
        );
      }
      if (reserva.pantalon && reserva.pantalon.ubicacionActual !== 'TIENDA') {
        throw new BadRequestException(
          `No se pueden registrar las mediciones: el pantalón no se encuentra físicamente en el local (ubicación actual: ${reserva.pantalon.ubicacionActual}).`,
        );
      }

      const medicionRepo = manager.getRepository(MedicionReserva);
      const existente = await medicionRepo.findOne({
        where: { reserva: { id: reservaId } },
      });

      let guardado: MedicionReserva;
      if (existente) {
        existente.medicionesJson = merged;
        existente.observacionSaco =
          dto.observacionSaco?.trim() ?? existente.observacionSaco;
        existente.observacionPantalon =
          dto.observacionPantalon?.trim() ?? existente.observacionPantalon;
        existente.observacionGeneral =
          dto.observacionGeneral?.trim() ?? existente.observacionGeneral;
        existente.sinModista = sinModista;
        existente.creadoPor = creadoPor
          ? ({ id: creadoPor } as User)
          : existente.creadoPor;
        guardado = await medicionRepo.save(existente);
      } else {
        const nuevo = medicionRepo.create({
          reserva,
          medicionesJson: merged,
          observacionSaco: dto.observacionSaco?.trim() ?? null,
          observacionPantalon: dto.observacionPantalon?.trim() ?? null,
          observacionGeneral: dto.observacionGeneral?.trim() ?? null,
          sinModista,
          creadoPor: creadoPor ? ({ id: creadoPor } as User) : null,
        });
        guardado = await medicionRepo.save(nuevo);
      }

      await this.tareasOperativasService.aplicarEfectosPostGuardadoMediciones(
        reservaId,
        creadoPor,
        sinModista,
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
