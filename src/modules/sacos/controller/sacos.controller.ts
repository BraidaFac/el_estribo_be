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
import { CreateSacoDto } from '../dto/create-saco.dto';
import { UpdateSacoDto } from '../dto/update-saco.dto';
import { SacosService } from '../service/sacos.service';

@Controller('v2/sacos')
@UseGuards(AuthGuard)
export class SacosController {
  constructor(private readonly sacosService: SacosService) {}

  @Get()
  listar() {
    return this.sacosService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.sacosService.obtener(id);
  }

  @Post()
  crear(@Body() body: CreateSacoDto) {
    return this.sacosService.crear(body);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSacoDto,
  ) {
    return this.sacosService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.sacosService.eliminar(id);
  }
}
