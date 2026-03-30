import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateControlPreEntregaDto } from '../dto/create-control-pre-entrega.dto';
import { ResolverRechazoPreEntregaDto } from '../dto/resolver-rechazo-pre-entrega.dto';
import { ControlPreEntregaService } from '../service/control-pre-entrega.service';

@Controller('v2/control-pre-entrega')
@UseGuards(AuthGuard)
export class ControlPreEntregaController {
  constructor(private readonly controlPreEntregaService: ControlPreEntregaService) {}

  @Get('planilla-preparar')
  planillaPreparar() {
    return this.controlPreEntregaService.planillaPreparar();
  }

  @Get('rechazados')
  listarRechazados() {
    return this.controlPreEntregaService.listarRechazados();
  }

  @Post()
  crear(@Body() body: CreateControlPreEntregaDto) {
    return this.controlPreEntregaService.crear(body);
  }

  @Patch(':id/resolver-rechazo')
  resolverRechazo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResolverRechazoPreEntregaDto,
  ) {
    return this.controlPreEntregaService.resolverRechazo(id, body);
  }
}
