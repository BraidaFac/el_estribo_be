import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateFeriadoDto } from '../dto/create-feriado.dto';
import { ListarFeriadosCrudQueryDto } from '../dto/listar-feriados-crud-query.dto';
import { UpdateFeriadoDto } from '../dto/update-feriado.dto';
import { FeriadosService } from '../service/feriados.service';

@Controller('v2/feriados')
@UseGuards(AuthGuard)
export class FeriadosController {
  constructor(private readonly feriadosService: FeriadosService) {}

  @Get()
  listar(@Query() query: ListarFeriadosCrudQueryDto) {
    const ano = query.ano;
    return this.feriadosService.listar(ano);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.feriadosService.obtener(id);
  }

  @Post()
  crear(@Body() body: CreateFeriadoDto) {
    return this.feriadosService.crear(body);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFeriadoDto,
  ) {
    return this.feriadosService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.feriadosService.eliminar(id);
  }
}
