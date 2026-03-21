import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateConfiguracionGeneralDto } from '../dto/update-configuracion-general.dto';
import { ConfiguracionGeneral } from '../entity/configuracion-general.entity';

const CONFIGURACION_GENERAL_SINGLETON_ID = 1;

@Injectable()
export class ConfiguracionGeneralService {
  constructor(
    @InjectRepository(ConfiguracionGeneral)
    private readonly configuracionRepository: Repository<ConfiguracionGeneral>,
  ) {}

  async obtener(): Promise<ConfiguracionGeneral> {
    const existente = await this.configuracionRepository.findOne({
      where: { id: CONFIGURACION_GENERAL_SINGLETON_ID },
    });

    if (existente) {
      return existente;
    }

    const inicial = this.configuracionRepository.create({
      id: CONFIGURACION_GENERAL_SINGLETON_ID,
      diasLavanderia: 2,
      diasModista: 2,
      diasTomarMediciones: 1,
      cantidadDiasPermitidoRetiro: 3,
    });

    return this.configuracionRepository.save(inicial);
  }

  async actualizar(
    dto: UpdateConfiguracionGeneralDto,
  ): Promise<ConfiguracionGeneral> {
    const actual = await this.obtener();

    if (dto.diasLavanderia !== undefined) {
      actual.diasLavanderia = dto.diasLavanderia;
    }
    if (dto.diasModista !== undefined) {
      actual.diasModista = dto.diasModista;
    }
    if (dto.diasTomarMediciones !== undefined) {
      actual.diasTomarMediciones = dto.diasTomarMediciones;
    }
    if (dto.cantidadDiasPermitidoRetiro !== undefined) {
      actual.cantidadDiasPermitidoRetiro = dto.cantidadDiasPermitidoRetiro;
    }
    return this.configuracionRepository.save(actual);
  }
}
