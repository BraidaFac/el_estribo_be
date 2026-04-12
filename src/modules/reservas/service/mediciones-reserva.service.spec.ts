import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoUbicacionPrenda } from '../../common/enums/reservas-domain.enums';
import { Pantalon } from '../../pantalones/entity/pantalon.entity';
import { Saco } from '../../sacos/entity/saco.entity';
import { TareasOperativasService } from '../../tareas-operativas/service/tareas-operativas.service';
import { DataSource, EntityManager } from 'typeorm';
import { MedicionReserva } from '../entity/medicion-reserva.entity';
import { Reserva } from '../entity/reserva.entity';
import { MedicionesReservaService } from './mediciones-reserva.service';

function buildReserva(
  sacoUbicacion: EstadoUbicacionPrenda,
  pantalonUbicacion?: EstadoUbicacionPrenda,
): Reserva {
  return {
    id: 1,
    saco: { id: 10, ubicacionActual: sacoUbicacion } as Saco,
    pantalon: pantalonUbicacion
      ? ({ id: 20, ubicacionActual: pantalonUbicacion } as Pantalon)
      : null,
  } as Reserva;
}

function buildDto(sinModista = false) {
  return { saco: {}, pantalon: {}, sinModista } as any;
}

describe('MedicionesReservaService — validación de ubicación', () => {
  let service: MedicionesReservaService;
  let mockManager: Partial<EntityManager>;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockManager = {
      getRepository: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb: (m: EntityManager) => Promise<unknown>) =>
        cb(mockManager as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicionesReservaService,
        { provide: getRepositoryToken(MedicionReserva), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Reserva), useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: TareasOperativasService,
          useValue: { aplicarEfectosPostGuardadoMediciones: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MedicionesReservaService>(MedicionesReservaService);
  });

  function setupManagerRepo(
    reserva: Reserva | null,
    medicion: MedicionReserva | null = null,
  ) {
    (mockManager.getRepository as jest.Mock).mockImplementation((entity: unknown) => {
      if (entity === Reserva) {
        return { findOne: jest.fn().mockResolvedValue(reserva) };
      }
      if (entity === MedicionReserva) {
        return {
          findOne: jest.fn().mockResolvedValue(medicion),
          create: jest.fn().mockReturnValue({}),
          save: jest.fn().mockResolvedValue({ updatedAt: new Date() }),
        };
      }
      return { findOne: jest.fn(), save: jest.fn() };
    });
  }

  it('lanza NotFoundException si la reserva no existe', async () => {
    setupManagerRepo(null);
    await expect(service.guardar(1, buildDto())).rejects.toThrow(NotFoundException);
  });

  it('lanza BadRequestException si el saco está en RETIRADO_CLIENTE', async () => {
    setupManagerRepo(buildReserva(EstadoUbicacionPrenda.RETIRADO_CLIENTE));
    await expect(service.guardar(1, buildDto())).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el saco está en EN_MODISTA', async () => {
    setupManagerRepo(buildReserva(EstadoUbicacionPrenda.EN_MODISTA));
    await expect(service.guardar(1, buildDto())).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el saco está en EN_LAVANDERIA', async () => {
    setupManagerRepo(buildReserva(EstadoUbicacionPrenda.EN_LAVANDERIA));
    await expect(service.guardar(1, buildDto())).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el pantalón está en EN_LAVANDERIA (saco en tienda)', async () => {
    setupManagerRepo(
      buildReserva(EstadoUbicacionPrenda.TIENDA, EstadoUbicacionPrenda.EN_LAVANDERIA),
    );
    await expect(service.guardar(1, buildDto())).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el pantalón está en RETIRADO_CLIENTE (saco en tienda)', async () => {
    setupManagerRepo(
      buildReserva(EstadoUbicacionPrenda.TIENDA, EstadoUbicacionPrenda.RETIRADO_CLIENTE),
    );
    await expect(service.guardar(1, buildDto())).rejects.toThrow(BadRequestException);
  });

  it('el error menciona "saco" cuando el saco no está en tienda', async () => {
    setupManagerRepo(buildReserva(EstadoUbicacionPrenda.RETIRADO_CLIENTE));
    await expect(service.guardar(1, buildDto())).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('saco') }),
    );
  });

  it('el error menciona "pantalón" cuando el pantalón no está en tienda', async () => {
    setupManagerRepo(
      buildReserva(EstadoUbicacionPrenda.TIENDA, EstadoUbicacionPrenda.EN_MODISTA),
    );
    await expect(service.guardar(1, buildDto())).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining('pantalón') }),
    );
  });

  it('con sinModista=true también valida la ubicación del saco', async () => {
    setupManagerRepo(buildReserva(EstadoUbicacionPrenda.RETIRADO_CLIENTE));
    await expect(service.guardar(1, buildDto(true))).rejects.toThrow(BadRequestException);
  });
});
