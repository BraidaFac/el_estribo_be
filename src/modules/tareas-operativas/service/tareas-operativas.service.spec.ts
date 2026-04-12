import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoTareaOperativa,
  EstadoUbicacionPrenda,
  TipoPrenda,
  TipoTareaOperativa,
} from '../../common/enums/reservas-domain.enums';
import { AsignacionServicioReserva } from '../../reservas/entity/asignacion-servicio-reserva.entity';
import { Reserva } from '../../reservas/entity/reserva.entity';
import { Saco } from '../../sacos/entity/saco.entity';
import { Pantalon } from '../../pantalones/entity/pantalon.entity';
import { BloqueoPlannerService } from '../../bloqueos/service/bloqueo-planner.service';
import { BloqueosService } from '../../bloqueos/service/bloqueos.service';
import { OperacionesPrendaService } from '../../operaciones-prenda/service/operaciones-prenda.service';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TareaOperativa } from '../entity/tarea-operativa.entity';
import { AgendaMedicion } from '../entity/agenda-medicion.entity';
import { TareasOperativasService } from './tareas-operativas.service';

function mockRepo<T>(overrides: Partial<Repository<T>> = {}): Repository<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  } as unknown as Repository<T>;
}

function buildTareaConSaco(
  ubicacion: EstadoUbicacionPrenda,
  tipo: TipoTareaOperativa = TipoTareaOperativa.LLEVAR_LAVANDERIA,
): TareaOperativa {
  const saco = { id: 1, ubicacionActual: ubicacion } as Saco;
  return {
    id: 10,
    tipoTarea: tipo,
    tipoPrenda: TipoPrenda.SACO,
    estado: EstadoTareaOperativa.PENDIENTE,
    saco,
    pantalon: null,
    reserva: { id: 5 } as Reserva,
    metadataJson: null,
  } as TareaOperativa;
}

function buildTareaConPantalon(
  ubicacion: EstadoUbicacionPrenda,
  tipo: TipoTareaOperativa = TipoTareaOperativa.LLEVAR_LAVANDERIA,
): TareaOperativa {
  const pantalon = { id: 2, ubicacionActual: ubicacion } as Pantalon;
  return {
    id: 11,
    tipoTarea: tipo,
    tipoPrenda: TipoPrenda.PANTALON,
    estado: EstadoTareaOperativa.PENDIENTE,
    saco: null,
    pantalon,
    reserva: { id: 5 } as Reserva,
    metadataJson: null,
  } as TareaOperativa;
}

describe('TareasOperativasService — validación de ubicación de prenda', () => {
  let service: TareasOperativasService;
  let mockManager: Partial<EntityManager>;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockManager = {
      getRepository: jest.fn().mockReturnValue(mockRepo()),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb: (m: EntityManager) => Promise<unknown>) =>
        cb(mockManager as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TareasOperativasService,
        { provide: getRepositoryToken(TareaOperativa), useValue: mockRepo() },
        { provide: getRepositoryToken(AsignacionServicioReserva), useValue: mockRepo() },
        { provide: getRepositoryToken(AgendaMedicion), useValue: mockRepo() },
        { provide: getRepositoryToken(Reserva), useValue: mockRepo() },
        { provide: getRepositoryToken(Saco), useValue: mockRepo() },
        { provide: getRepositoryToken(Pantalon), useValue: mockRepo() },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BloqueoPlannerService, useValue: { obtenerRangosPlanificados: jest.fn() } },
        { provide: BloqueosService, useValue: {} },
        {
          provide: OperacionesPrendaService,
          useValue: { actualizarUbicacion: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TareasOperativasService>(TareasOperativasService);
  });

  describe('marcarEnviadoLavanderia', () => {
    it('permite avanzar cuando el saco está en TIENDA', async () => {
      const tarea = buildTareaConSaco(EstadoUbicacionPrenda.TIENDA);
      const savedTarea = { ...tarea };
      const repoMock = mockRepo<TareaOperativa>({
        findOne: jest.fn().mockResolvedValue(tarea),
        save: jest.fn().mockResolvedValue(savedTarea),
      });
      (mockManager.getRepository as jest.Mock).mockReturnValue(repoMock);
      (service as any).operacionesPrendaService = {
        actualizarUbicacion: jest.fn().mockResolvedValue(undefined),
      };

      await expect(service.marcarEnviadoLavanderia(10)).resolves.not.toThrow();
    });

    it.each([
      EstadoUbicacionPrenda.RETIRADO_CLIENTE,
      EstadoUbicacionPrenda.EN_MODISTA,
      EstadoUbicacionPrenda.EN_LAVANDERIA,
    ])('lanza BadRequestException cuando el saco está en %s', async (ubicacion) => {
      const tarea = buildTareaConSaco(ubicacion);
      const repoMock = mockRepo<TareaOperativa>({
        findOne: jest.fn().mockResolvedValue(tarea),
      });
      (mockManager.getRepository as jest.Mock).mockReturnValue(repoMock);

      await expect(service.marcarEnviadoLavanderia(10)).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException cuando el pantalón está en RETIRADO_CLIENTE', async () => {
      const tarea = buildTareaConPantalon(EstadoUbicacionPrenda.RETIRADO_CLIENTE);
      tarea.tipoTarea = TipoTareaOperativa.LLEVAR_LAVANDERIA;
      const repoMock = mockRepo<TareaOperativa>({
        findOne: jest.fn().mockResolvedValue(tarea),
      });
      (mockManager.getRepository as jest.Mock).mockReturnValue(repoMock);

      await expect(service.marcarEnviadoLavanderia(11)).rejects.toThrow(BadRequestException);
    });
  });

  describe('marcarEnviadoModista', () => {
    it('permite avanzar cuando el saco está en TIENDA', async () => {
      const tarea = buildTareaConSaco(
        EstadoUbicacionPrenda.TIENDA,
        TipoTareaOperativa.LLEVAR_MODISTA,
      );
      const repoMock = mockRepo<TareaOperativa>({
        findOne: jest.fn().mockResolvedValue(tarea),
        save: jest.fn().mockResolvedValue(tarea),
      });
      (mockManager.getRepository as jest.Mock).mockReturnValue(repoMock);
      (service as any).operacionesPrendaService = {
        actualizarUbicacion: jest.fn().mockResolvedValue(undefined),
      };

      await expect(service.marcarEnviadoModista(10)).resolves.not.toThrow();
    });

    it.each([
      EstadoUbicacionPrenda.RETIRADO_CLIENTE,
      EstadoUbicacionPrenda.EN_MODISTA,
      EstadoUbicacionPrenda.EN_LAVANDERIA,
    ])('lanza BadRequestException cuando el saco está en %s', async (ubicacion) => {
      const tarea = buildTareaConSaco(ubicacion, TipoTareaOperativa.LLEVAR_MODISTA);
      const repoMock = mockRepo<TareaOperativa>({
        findOne: jest.fn().mockResolvedValue(tarea),
      });
      (mockManager.getRepository as jest.Mock).mockReturnValue(repoMock);

      await expect(service.marcarEnviadoModista(10)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assertPrendaEnTienda (helper privado)', () => {
    it('no lanza cuando la ubicación es TIENDA', () => {
      expect(() =>
        (service as any).assertPrendaEnTienda(EstadoUbicacionPrenda.TIENDA, TipoPrenda.SACO),
      ).not.toThrow();
    });

    it.each([
      EstadoUbicacionPrenda.RETIRADO_CLIENTE,
      EstadoUbicacionPrenda.EN_MODISTA,
      EstadoUbicacionPrenda.EN_LAVANDERIA,
    ])('lanza BadRequestException para ubicación %s', (ubicacion) => {
      expect(() =>
        (service as any).assertPrendaEnTienda(ubicacion, TipoPrenda.SACO),
      ).toThrow(BadRequestException);
    });

    it('el mensaje menciona "saco" para TipoPrenda.SACO', () => {
      expect(() =>
        (service as any).assertPrendaEnTienda(
          EstadoUbicacionPrenda.RETIRADO_CLIENTE,
          TipoPrenda.SACO,
        ),
      ).toThrow(expect.objectContaining({ message: expect.stringContaining('saco') }));
    });

    it('el mensaje menciona "pantalón" para TipoPrenda.PANTALON', () => {
      expect(() =>
        (service as any).assertPrendaEnTienda(
          EstadoUbicacionPrenda.RETIRADO_CLIENTE,
          TipoPrenda.PANTALON,
        ),
      ).toThrow(expect.objectContaining({ message: expect.stringContaining('pantalón') }));
    });
  });
});
