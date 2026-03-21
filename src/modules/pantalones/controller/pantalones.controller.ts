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
import { CreatePantalonDto } from '../dto/create-pantalon.dto';
import { UpdatePantalonDto } from '../dto/update-pantalon.dto';
import { PantalonesService } from '../service/pantalones.service';

@Controller('v2/pantalones')
@UseGuards(AuthGuard)
export class PantalonesController {
  constructor(private readonly pantalonesService: PantalonesService) {}

  @Get()
  listar() {
    return this.pantalonesService.listar();
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.pantalonesService.obtener(id);
  }

  @Post()
  crear(@Body() body: CreatePantalonDto) {
    return this.pantalonesService.crear(body);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePantalonDto,
  ) {
    return this.pantalonesService.actualizar(id, body);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.pantalonesService.eliminar(id);
  }
}
