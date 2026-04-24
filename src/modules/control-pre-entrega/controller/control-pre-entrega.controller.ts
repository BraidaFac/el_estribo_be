import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ReqWithUser } from 'src/auth/req-with-user.interface';
import { CreateControlPreEntregaDto } from '../dto/create-control-pre-entrega.dto';
import { ResolverRechazoPreEntregaDto } from '../dto/resolver-rechazo-pre-entrega.dto';
import { ControlPreEntregaService } from '../service/control-pre-entrega.service';

@Controller('v2/control-pre-entrega')
@UseGuards(AuthGuard)
export class ControlPreEntregaController {
  constructor(
    private readonly controlPreEntregaService: ControlPreEntregaService,
  ) {}

  @Get('planilla-preparar')
  planillaPreparar(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.controlPreEntregaService.planillaPreparar(desde, hasta);
  }

  @Get('rechazados')
  listarRechazados() {
    return this.controlPreEntregaService.listarRechazados();
  }

  @Post()
  crear(@Body() body: CreateControlPreEntregaDto, @Req() req: ReqWithUser) {
    return this.controlPreEntregaService.crear(body, req.user.sub);
  }

  @Patch(':id/resolver-rechazo')
  resolverRechazo(
    @Param('id', ParseIntPipe) id: number,
    @Body() _body: ResolverRechazoPreEntregaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.controlPreEntregaService.resolverRechazo(id, req.user.sub);
  }
}
