import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ListarDiasNoLaborablesQueryDto } from '../dto/listar-dias-no-laborables-query.dto';
import { ListarFeriadosQueryDto } from '../dto/listar-feriados-query.dto';
import { CalendarioLaboralService } from '../service/calendario-laboral.service';

@Controller('v2/calendario-laboral')
@UseGuards(AuthGuard)
export class CalendarioLaboralController {
  constructor(
    private readonly calendarioLaboralService: CalendarioLaboralService,
  ) {}

  @Get('feriados')
  listarFeriados(@Query() query: ListarFeriadosQueryDto) {
    return this.calendarioLaboralService.listarFeriados(
      query.desde,
      query.hasta,
    );
  }

  @Get('dias-no-laborables')
  listarDiasNoLaborables(@Query() query: ListarDiasNoLaborablesQueryDto) {
    return this.calendarioLaboralService.listarDiasNoLaborables(
      query.desde,
      query.hasta,
    );
  }
}
