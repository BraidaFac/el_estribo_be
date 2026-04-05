import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateAccesorioDto } from '../dto/create-accesorio.dto';
import { UpdateAccesorioDto } from '../dto/update-accesorio.dto';
import { AccesoriosService } from '../service/accesorios.service';

@Controller('v2/accesorios')
@UseGuards(AuthGuard)
export class AccesoriosController {
  constructor(private readonly accesoriosService: AccesoriosService) {}

  @Get()
  findAll() {
    return this.accesoriosService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAccesorioDto) {
    return this.accesoriosService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccesorioDto) {
    return this.accesoriosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.accesoriosService.remove(id);
  }
}
