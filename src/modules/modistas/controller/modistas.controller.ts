import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateModistaDto } from '../dto/create-modista.dto';
import { UpdateModistaDto } from '../dto/update-modista.dto';
import { ModistasService } from '../service/modistas.service';

@Controller('v2/modistas')
@UseGuards(AuthGuard)
export class ModistasController {
  constructor(private readonly modistasService: ModistasService) {}

  @Post()
  crear(@Body() body: CreateModistaDto) {
    return this.modistasService.crear(body);
  }

  @Get()
  listar() {
    return this.modistasService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.modistasService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateModistaDto,
  ) {
    return this.modistasService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.modistasService.eliminar(id);
  }

  @Patch(':id/predeterminada')
  setPredeterminada(@Param('id', ParseIntPipe) id: number) {
    return this.modistasService.setPredeterminada(id);
  }
}
