import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { TipoPrenda } from 'src/modules/common/enums/reservas-domain.enums';
import { CancelarBloqueoDto } from '../dto/cancelar-bloqueo.dto';
import { ListarBloqueosQueryDto } from '../dto/listar-bloqueos-query.dto';
import { BloqueosService } from '../service/bloqueos.service';

@Controller('v2/bloqueos')
@UseGuards(AuthGuard)
export class BloqueosController {
  constructor(private readonly bloqueosService: BloqueosService) {}

  @Get('prendas/:tipoPrenda/:prendaId')
  listarPorPrenda(
    @Param('tipoPrenda') tipoPrenda: TipoPrenda,
    @Param('prendaId', ParseIntPipe) prendaId: number,
    @Query() query: ListarBloqueosQueryDto,
  ) {
    return this.bloqueosService.listarPorPrenda(
      tipoPrenda,
      prendaId,
      query.desde,
      query.hasta,
    );
  }

  @Patch(':bloqueoId/cancelar')
  cancelar(
    @Param('bloqueoId', ParseIntPipe) bloqueoId: number,
    @Body() body: CancelarBloqueoDto,
  ) {
    return this.bloqueosService.cancelarManual(
      bloqueoId,
      body.usuarioId ?? 'system-user',
      body.motivoCancelacion,
    );
  }
}
