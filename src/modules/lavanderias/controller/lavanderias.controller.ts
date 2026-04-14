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
import { CreateLavanderiaDto } from '../dto/create-lavanderia.dto';
import {
  CreatePrecioHistoricoDto,
  UpdatePrecioHistoricoDto,
} from '../dto/precio-historico.dto';
import { UpdateLavanderiaDto } from '../dto/update-lavanderia.dto';
import { LavanderiasService } from '../service/lavanderias.service';

@Controller('v2/lavanderias')
@UseGuards(AuthGuard)
export class LavanderiasController {
  constructor(private readonly lavanderiasService: LavanderiasService) {}

  @Post()
  crear(@Body() body: CreateLavanderiaDto) {
    return this.lavanderiasService.crear(body);
  }

  @Get()
  listar() {
    return this.lavanderiasService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.lavanderiasService.obtener(id);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLavanderiaDto,
  ) {
    return this.lavanderiasService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.lavanderiasService.eliminar(id);
  }

  @Patch(':id/predeterminada')
  setPredeterminada(@Param('id', ParseIntPipe) id: number) {
    return this.lavanderiasService.setPredeterminada(id);
  }

  // ── Precios históricos ──────────────────────────────────────────────────────

  @Get(':id/precios')
  listarPrecios(@Param('id', ParseIntPipe) id: number) {
    return this.lavanderiasService.listarPrecios(id);
  }

  @Post(':id/precios')
  agregarPrecio(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreatePrecioHistoricoDto,
  ) {
    return this.lavanderiasService.agregarPrecio(id, body);
  }

  @Patch(':id/precios/:precioId')
  actualizarPrecio(
    @Param('id', ParseIntPipe) _id: number,
    @Param('precioId', ParseIntPipe) precioId: number,
    @Body() body: UpdatePrecioHistoricoDto,
  ) {
    return this.lavanderiasService.actualizarPrecio(precioId, body);
  }

  @Delete(':id/precios/:precioId')
  eliminarPrecio(
    @Param('id', ParseIntPipe) _id: number,
    @Param('precioId', ParseIntPipe) precioId: number,
  ) {
    return this.lavanderiasService.eliminarPrecio(precioId);
  }
}
