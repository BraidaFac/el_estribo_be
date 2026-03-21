import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { UpdateConfiguracionGeneralDto } from '../dto/update-configuracion-general.dto';
import { ConfiguracionGeneralService } from '../service/configuracion-general.service';

@Controller('v2/configuracion-general')
@UseGuards(AuthGuard)
export class ConfiguracionGeneralController {
  constructor(
    private readonly configuracionGeneralService: ConfiguracionGeneralService,
  ) {}

  @Get()
  obtener() {
    return this.configuracionGeneralService.obtener();
  }

  @Patch()
  actualizar(@Body() body: UpdateConfiguracionGeneralDto) {
    return this.configuracionGeneralService.actualizar(body);
  }
}
