import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { PatchDevolucionExtrasDto } from '../dto/patch-devolucion-extras.dto';
import { SetReservaExtrasDto } from '../dto/set-reserva-extras.dto';
import { ReservaExtrasService } from '../service/reserva-extras.service';

@Controller('v2/reservas/:reservaId/extras')
@UseGuards(AuthGuard)
export class ReservaExtrasController {
  constructor(private readonly reservaExtrasService: ReservaExtrasService) {}

  @Get()
  findAll(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.reservaExtrasService.findByReserva(reservaId);
  }

  @Put()
  setExtras(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() dto: SetReservaExtrasDto,
  ) {
    return this.reservaExtrasService.setExtras(reservaId, dto);
  }

  @Patch('devolucion')
  patchDevolucion(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() dto: PatchDevolucionExtrasDto,
  ) {
    return this.reservaExtrasService.patchDevolucion(reservaId, dto);
  }
}
